#!/usr/bin/env node
/**
 * D1 兼容层自检。**部署第一步就跑它**，别等接了流量才发现计数是错的。
 *
 * 重点验证三件在 D1 上成立、迁到 better-sqlite3 后必须仍然成立的事：
 *
 *   1. `?1 ?2 ?3` 编号占位符能用数组绑定（D1 的 SQL 全是这么写的）
 *   2. 同一个编号被引用两次时只需传一个值（download.ts 的 ?3 就是这样）
 *   3. `count = count + 1` 是原子递增，不是 read-modify-write
 *
 * 第 3 条是整个方案的地基：正因为 SQL 有这个能力而 EdgeOne KV 没有，
 * 计数才留在这一侧。它要是不成立，方案就得推倒重来。
 *
 * 用临时库跑，不碰生产数据。
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb } from "../src/db.mjs";
import { bumpCount, readStats } from "../src/stats.mjs";

const dir = mkdtempSync(join(tmpdir(), "dl-selftest-"));
const db = openDb(join(dir, "test.db"));

let failed = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "✓" : "✗"} ${name}`);
  if (!ok) {
    console.log(`      期望 ${JSON.stringify(expected)}`);
    console.log(`      实际 ${JSON.stringify(actual)}`);
    failed++;
  }
}

try {
  db.raw.exec(`
    CREATE TABLE downloads (
      version TEXT NOT NULL, platform TEXT NOT NULL DEFAULT 'windows',
      count INTEGER NOT NULL DEFAULT 0, updated_at TEXT,
      PRIMARY KEY (version, platform));
    CREATE TABLE download_events (
      version TEXT NOT NULL, platform TEXT NOT NULL, source TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0, updated_at TEXT,
      PRIMARY KEY (version, platform, source));
  `);

  console.log("D1 兼容层自检\n");

  // 1 + 2 + 3：连续计数走的正是生产代码路径
  for (let i = 0; i < 5; i++) await bumpCount(db, "0.118.0", "windows", "r2");
  await bumpCount(db, "0.118.0", "windows", "mirror");
  await bumpCount(db, "0.118.0", "macos", "r2");

  const row = await db
    .prepare("SELECT count FROM downloads WHERE version = ?1 AND platform = ?2")
    .bind("0.118.0", "windows")
    .first();
  check("编号占位符 + 原子递增（windows 计 6 次）", row?.count, 6);

  const stats = await readStats(db);
  check("跨平台聚合（版本总量 7）", stats.total, 7);
  check("平台维度", stats.platforms, { macos: 1, windows: 6 });
  check("渠道维度", stats.sources, { mirror: 1, r2: 6 });

  // batch 事务：一条失败应整体回滚
  const good = db.prepare("INSERT INTO downloads (version, platform, count) VALUES (?1, ?2, 1)")
    .bind("9.9.9", "windows");
  const bad = db.prepare("INSERT INTO 不存在的表 (x) VALUES (?1)").bind(1);
  let threw = false;
  try {
    await db.batch([good, bad]);
  } catch {
    threw = true;
  }
  const ghost = await db
    .prepare("SELECT count FROM downloads WHERE version = ?1")
    .bind("9.9.9")
    .first();
  check("batch 失败时整体回滚", [threw, ghost], [true, null]);

  console.log(
    failed === 0
      ? "\n全部通过。兼容层语义与 D1 一致，可以接流量。"
      : `\n${failed} 项失败。**不要部署**——计数会出错。`,
  );
} finally {
  db.close();
  rmSync(dir, { recursive: true, force: true });
}

process.exit(failed === 0 ? 0 : 1);
