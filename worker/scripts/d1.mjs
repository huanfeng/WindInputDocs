#!/usr/bin/env node
/**
 * D1 执行器。所有对数据库的操作都从这里走。
 *
 * 两个坑，都踩过：
 *
 * 1. **不能用 `--file`**。wrangler 对 `--file` 走 D1 的 **import** 端点（为支持大文件
 *    做暂存上传），与 `--command` 的 **query** 端点是两套授权路径。OAuth token 即便有
 *    `d1 (write)`，import 端点仍可能返回 `Authentication error [code: 10000]`。
 *    query 端点没这问题，所以这里把 .sql 文件读进来拆成语句，逐条用 `--command` 发。
 *
 * 2. **不能 spawn `npx.cmd`**。Node ≥ 20.12.2 出于 CVE-2024-27980 不再为 .bat/.cmd
 *    自动套 shell，直接 spawn 会 EINVAL；若强行加 `shell: true`，参数又要经 cmd.exe
 *    解析，URL 里的 `&` `=` 会被截断或错解。改为用 `process.execPath` 直接跑 wrangler
 *    的 JS 入口——不经 shell，参数原样传递，任何字符都安全。
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const WRANGLER = join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
const DB = "windinput-downloads";

// 迁移到自建服务（../service-dl）后的数据后端。两个变量都设了就走 HTTP，
// 否则维持原样走 wrangler + D1 —— 迁移期两条路都要能用，好做双写对账。
const SERVICE_URL = process.env.DL_SERVICE_URL;
const SERVICE_TOKEN = process.env.DL_SERVICE_TOKEN;

/**
 * 子进程里跑的取数脚本。
 *
 * 存在的唯一理由是**把异步 fetch 变回同步调用**：runSql 是同步函数，
 * mirror.mjs 的全部数据访问都建立在这个契约上（`const d1 = (sql) => runSql(sql)`）。
 * 改成 async 要给那 521 行里的每个调用点加 await，而它们此刻是对的、在生产上跑着。
 * 花一次进程启动的代价换零改动，对一个人工触发的运维脚本来说很划算。
 */
const FETCH_SCRIPT = `
let input = "";
process.stdin.on("data", (c) => { input += c; });
process.stdin.on("end", async () => {
  const { url, token, sql } = JSON.parse(input);
  try {
    const res = await fetch(url + "/admin/sql", {
      method: "POST",
      headers: { "content-type": "application/json", "x-auth-token": token },
      body: JSON.stringify({ sql }),
    });
    const text = await res.text();
    if (!res.ok) { process.stderr.write("服务返回 " + res.status + "：" + text); process.exit(1); }
    process.stdout.write(text);
  } catch (e) {
    process.stderr.write("请求失败：" + (e && e.message ? e.message : String(e)));
    process.exit(1);
  }
});
`;

/** 走自建服务执行 SQL，返回值形状与 wrangler --json 分支完全一致。 */
function runSqlRemote(sql) {
  if (!SERVICE_TOKEN) {
    throw new Error("设了 DL_SERVICE_URL 却没设 DL_SERVICE_TOKEN，服务会拒绝请求");
  }
  const out = execFileSync(process.execPath, ["-e", FETCH_SCRIPT], {
    input: JSON.stringify({
      url: SERVICE_URL.replace(/\/+$/, ""),
      token: SERVICE_TOKEN,
      sql,
    }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
  const parsed = JSON.parse(out);
  return parsed[parsed.length - 1]?.results ?? [];
}

/**
 * 执行一条（或多条）SQL，返回最后一条语句的结果行。
 * 参数不经 shell，URL 等含特殊字符的值可以直接传。
 *
 * 后端由 DL_SERVICE_URL 决定：设了走自建服务，没设走 wrangler + D1。
 * 调用方（mirror.mjs）对此无感知 —— 这正是把切换点收在这里的目的。
 */
export function runSql(sql, { remote = true } = {}) {
  // 自建服务只有一个库，没有 --local/--remote 之分，remote 参数在这条路径上无意义
  if (SERVICE_URL) return runSqlRemote(sql);

  const out = execFileSync(
    process.execPath,
    [
      WRANGLER,
      "d1",
      "execute",
      DB,
      remote ? "--remote" : "--local",
      "--json",
      "--command",
      sql,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], cwd: ROOT },
  );
  const start = out.indexOf("[");
  const end = out.lastIndexOf("]");
  if (start < 0 || end < 0) return [];
  const parsed = JSON.parse(out.slice(start, end + 1));
  return parsed[parsed.length - 1]?.results ?? [];
}

/**
 * 把 .sql 文件拆成独立语句。
 * 只剔除**整行**以 `--` 开头的注释——按行内位置切会误伤 URL 里的 `--`。
 */
export function splitStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── CLI：node scripts/d1.mjs <file.sql> [--local] [--backup <表名>] ──────

if (process.argv[1] && process.argv[1].endsWith("d1.mjs")) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const remote = !args.includes("--local");
  const backupIdx = args.indexOf("--backup");
  const backupTable = backupIdx >= 0 ? args[backupIdx + 1] : null;

  if (!file) {
    console.error("用法：node scripts/d1.mjs <file.sql> [--local] [--backup <表名>]");
    process.exit(1);
  }

  // 迁移这类不可逆操作前先把表拉下来存一份。D1 没有快照，出事只能靠这个。
  if (backupTable && remote) {
    const rows = runSql(`SELECT * FROM ${backupTable}`, { remote });
    const dir = join(ROOT, ".backups");
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = join(dir, `${backupTable}-${stamp}.json`);
    writeFileSync(path, JSON.stringify(rows, null, 2), "utf8");
    console.log(`已备份 ${backupTable}（${rows.length} 行）→ ${path}\n`);
  }

  const statements = splitStatements(readFileSync(join(ROOT, file), "utf8"));
  console.log(`执行 ${file}（${statements.length} 条语句，${remote ? "远程" : "本地"}）\n`);

  for (const [i, stmt] of statements.entries()) {
    const label = stmt.replace(/\s+/g, " ").slice(0, 70);
    process.stdout.write(`  [${i + 1}/${statements.length}] ${label}… `);
    try {
      runSql(stmt, { remote });
      console.log("ok");
    } catch (e) {
      // 逐条执行没有事务性，中途失败要让人立刻看到停在哪一条
      console.log("失败");
      console.error(`\n第 ${i + 1} 条语句失败，后续语句未执行：\n  ${stmt}\n`);
      process.exit(1);
    }
  }
  console.log("\n全部完成。");
}
