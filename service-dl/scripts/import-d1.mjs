#!/usr/bin/env node
/**
 * 把 D1 导出的数据灌进本地 SQLite。
 *
 * 用法（先在装了 wrangler 的机器上导出，见 README 的迁移步骤）：
 *   node scripts/import-d1.mjs <导出目录>
 *
 * 导出目录里应有三个文件，分别是三张表的 `SELECT *` 结果（JSON 数组）：
 *   downloads.json  download_events.json  mirrors.json
 *
 * **幂等**：用 INSERT OR REPLACE 按主键覆盖，重复导入不会翻倍。这点很重要——
 * 迁移期要「双写对账」，会来回导好几次。
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDb } from "../src/db.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DB_PATH = resolve(process.env.DB_PATH ?? join(ROOT, "data/downloads.db"));

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("用法：node scripts/import-d1.mjs <导出目录>");
  process.exit(1);
}

/** 表名 → 列清单。显式写死而不是从数据里推断：导出文件里若缺了某列
 *  （比如某张表当时还没有数据），按数据推断会建出一条列数不对的 INSERT。 */
const TABLES = {
  downloads: ["version", "platform", "count", "updated_at"],
  download_events: ["version", "platform", "source", "count", "updated_at"],
  mirrors: [
    "key",
    "url",
    "size",
    "enabled",
    "fail_count",
    "last_check",
    "last_status",
    "updated_at",
  ],
};

const db = openDb(DB_PATH);

for (const [table, columns] of Object.entries(TABLES)) {
  const file = join(srcDir, `${table}.json`);
  if (!existsSync(file)) {
    console.log(`跳过 ${table}：${file} 不存在`);
    continue;
  }

  const rows = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`跳过 ${table}：无数据`);
    continue;
  }

  const placeholders = columns.map((_, i) => `?${i + 1}`).join(", ");
  const stmt = db.raw.prepare(
    `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
  );

  // 一个事务灌完：几千行的逐条提交会慢上两个数量级
  const tx = db.raw.transaction((list) => {
    for (const row of list) stmt.run(...columns.map((c) => row[c] ?? null));
  });
  tx(rows);

  console.log(`已导入 ${table}：${rows.length} 行`);
}

// 对账：导入后立刻打出总量，与 D1 侧的 /api/stats 对比
const total = db.raw
  .prepare("SELECT SUM(count) AS n FROM downloads")
  .get();
console.log(`\n导入完成。downloads 总计数：${total?.n ?? 0}`);
console.log("请与迁移前的 https://dl.windinput.com/api/stats 的 total 核对。");

db.close();
