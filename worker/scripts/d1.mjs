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

/**
 * 执行一条（或多条）SQL，返回最后一条语句的结果行。
 * 参数不经 shell，URL 等含特殊字符的值可以直接传。
 *
 * 保持**同步**是个契约，不是疏忽：mirror.mjs 的全部数据访问建立在
 * `const d1 = (sql) => runSql(sql)` 这一行上。改成 async 要给那 521 行里的
 * 每个调用点加 await，而它们此刻是对的、在生产上跑着。
 */
export function runSql(sql, { remote = true } = {}) {
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
