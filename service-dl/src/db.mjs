/**
 * D1 兼容层：把 better-sqlite3 包成 D1 的接口形状。
 *
 * 为什么不直接用 better-sqlite3 的原生 API：worker/src/ 里的每一条 SQL 都是照着
 * D1 的 `prepare().bind().all()/run()/batch()` 写的。套一层几十行的适配器，
 * **那些 SQL 与调用代码就能原样搬过来**——包括 `ON CONFLICT DO UPDATE` 的原子
 * 递增、batch 事务、以及 `?1 ?2` 这种编号占位符。改写成原生 API 要逐条重写，
 * 每一条都是一次引入笔误的机会，而它们此刻正在生产环境上跑着、是对的。
 *
 * 两处刻意的差异：
 *
 * 1. **同步变异步**。better-sqlite3 是同步的（SQLite 本地文件读写本就该同步），
 *    这里包成 Promise 只为了对上 D1 的形状。调用方 await 到的其实是已完成的值。
 *
 * 2. **batch 是真事务**。D1 的 batch 保证整体成功或整体失败；这里用
 *    better-sqlite3 的 transaction() 实现，语义一致。download.ts 里「batch 失败
 *    就降级为只写总量」那段逻辑因此仍然成立。
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

/**
 * 把 D1 风格的位置参数转成 better-sqlite3 认的形式。
 *
 * **这里有个会静默毁掉计数的坑**（自检脚本就是为它写的）：D1 的 SQL 全用编号
 * 占位符 `?1 ?2 ?3`，而 better-sqlite3 对编号占位符**只接受对象绑定**
 * （键是编号），传数组会抛 `Too many parameter values were provided`。
 *
 * 更要命的是它错在哪：download.ts 的 bumpCount 把两条语句放进 batch，失败时
 * 「降级为只写总量」——而降级的那条同样是编号占位符，同样失败。于是每一次下载
 * 都在 catch 里静默走完，计数一条不写，服务却一切正常、日志只有一行降级提示。
 *
 * 对象形式还顺带解决了重复引用：`?3` 在 ON CONFLICT 子句里再出现一次时，
 * 数组形式会因为「值比占位符多」报错，对象形式则天然按编号取值。
 */
function bindArgs(sql, args) {
  if (args.length === 0) return [];
  if (!/\?\d/.test(sql)) return args; // 匿名 `?` 占位符：仍用数组

  const byIndex = {};
  args.forEach((v, i) => {
    byIndex[i + 1] = v;
  });
  return [byIndex];
}

class Statement {
  constructor(db, sql, args) {
    this.db = db;
    this.sql = sql;
    this.args = args;
  }

  /** D1 的 bind 返回新语句而不是就地改写，这里保持同样的语义 */
  bind(...args) {
    return new Statement(this.db, this.sql, args);
  }

  async all() {
    return {
      results: this.db.prepare(this.sql).all(...bindArgs(this.sql, this.args)),
      success: true,
    };
  }

  async first() {
    return this.db.prepare(this.sql).get(...bindArgs(this.sql, this.args)) ?? null;
  }

  async run() {
    const info = this.db.prepare(this.sql).run(...bindArgs(this.sql, this.args));
    return {
      success: true,
      meta: { changes: info.changes, last_row_id: info.lastInsertRowid },
    };
  }

  /** 供 batch 在事务内同步执行；外部不要直接调 */
  runSync() {
    return this.db.prepare(this.sql).run(...bindArgs(this.sql, this.args));
  }
}

export function openDb(path) {
  // 建目录是开库的前提，放在这里而不是各个调用方：init-db / import-d1 / 服务本身
  // 都要开库，漏掉任何一处就是一句「directory does not exist」——而最可能漏的
  // 恰恰是初始化脚本，也就是全新部署时跑的第一条命令。
  mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);

  // WAL：读写不互相阻塞。计数是持续的小写入，stats 是偶发的读，
  // 默认的 journal 模式下两者会互相等锁。
  db.pragma("journal_mode = WAL");
  // 断电丢最后几条计数可以接受，换取写入不必每次等磁盘同步。
  // 计数本就是「尽力而为的近似值」（见 worker/src/index.ts 的口径说明）。
  db.pragma("synchronous = NORMAL");
  // 并发写入时等待而不是立刻抛 SQLITE_BUSY
  db.pragma("busy_timeout = 5000");

  const batchTx = db.transaction((statements) => {
    for (const s of statements) s.runSync();
  });

  return {
    prepare: (sql) => new Statement(db, sql, []),

    async batch(statements) {
      batchTx(statements);
      return statements.map(() => ({ success: true }));
    },

    /** 迁移脚本与自检用的逃生口，业务代码不该碰 */
    raw: db,

    close: () => db.close(),
  };
}
