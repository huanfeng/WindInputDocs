#!/usr/bin/env node
/**
 * 建表。读 schema.sql 逐条执行，可重复运行（语句都带 IF NOT EXISTS）。
 *
 * schema.sql 与 worker/schema.sql 是同一份 —— D1 就是 SQLite，表结构不需要
 * 任何转换。迁移数据前先跑这个。
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDb } from "../src/db.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DB_PATH = resolve(process.env.DB_PATH ?? join(ROOT, "data/downloads.db"));

const statements = readFileSync(join(ROOT, "schema.sql"), "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const db = openDb(DB_PATH);
for (const [i, sql] of statements.entries()) {
  db.raw.prepare(sql).run();
  console.log(`  [${i + 1}/${statements.length}] ${sql.replace(/\s+/g, " ").slice(0, 60)}…`);
}
db.close();
console.log(`\n建表完成：${DB_PATH}`);
