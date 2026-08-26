/**
 * 下载计数的读写。SQL 逐字搬自 worker/src/download.ts 与 worker/src/stats.ts——
 * D1 就是 SQLite，这些语句在两边是同一套语义，改写只会引入笔误。
 */

/**
 * 双写：downloads 记总量（前端徽章数据源，含历史数据），download_events 记渠道。
 * batch 是一个事务，若 download_events 尚未建表会整体失败——那时降级为只写
 * downloads，保证「新表没建好」不会连总计数一起丢。
 *
 * 计数走单行原子 UPDATE（`count = count + 1`），并发安全、不丢数。这正是
 * EdgeOne KV 给不了的东西：KV 只有 get/put，递增得靠 read-modify-write，
 * 两个节点同时读到 100 都写 101 就丢一次——计数留在 SQL 这一侧的根本原因。
 */
export async function bumpCount(db, version, platform, source) {
  const now = new Date().toISOString();

  const total = db
    .prepare(
      `INSERT INTO downloads (version, platform, count, updated_at)
       VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(version, platform) DO UPDATE SET count = count + 1, updated_at = ?3`,
    )
    .bind(version, platform, now);

  const bySource = db
    .prepare(
      `INSERT INTO download_events (version, platform, source, count, updated_at)
       VALUES (?1, ?2, ?3, 1, ?4)
       ON CONFLICT(version, platform, source) DO UPDATE SET count = count + 1, updated_at = ?4`,
    )
    .bind(version, platform, source, now);

  try {
    await db.batch([total, bySource]);
  } catch (e) {
    console.error("分渠道计数写入失败，降级为只记总量：", e?.message ?? e);
    await total.run();
  }
}

/**
 * 统计数据。对外结构保持 { total, versions, platforms, sources } 不变——
 * 前端 download-stats.tsx 依赖它，versions 按版本**跨平台聚合**。
 */
export async function readStats(db) {
  const { results } = await db
    .prepare(
      "SELECT version, SUM(count) AS count FROM downloads GROUP BY version ORDER BY count DESC",
    )
    .all();

  const versions = results ?? [];
  const total = versions.reduce((sum, r) => sum + r.count, 0);

  // 平台与渠道分布都是附加信息，查不到不该拖垮 stats
  const platforms = await sumBy(
    db,
    "SELECT platform AS k, SUM(count) AS v FROM downloads GROUP BY platform",
  );
  const sources = await sumBy(
    db,
    "SELECT source AS k, SUM(count) AS v FROM download_events GROUP BY source",
  );

  return { total, versions, platforms, sources };
}

async function sumBy(db, sql) {
  const out = {};
  try {
    const { results } = await db.prepare(sql).all();
    for (const row of results ?? []) out[row.k] = row.v;
  } catch {
    // 表还没建好等情况：返回空对象，不影响主字段
  }
  return out;
}
