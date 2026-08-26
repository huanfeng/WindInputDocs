/**
 * 镜像映射：热路径读取与定时探活。搬自 worker/src/mirrors.ts。
 *
 * 相对 Worker 版的两处简化，都是「换了运行环境后约束消失了」而不是功能缩水：
 *
 * 1. **整表边缘缓存整段删掉。** Worker 里那层 Cache API 是为了避免每次下载都跨网络
 *    查一次 D1；这里 SQLite 是本地文件，一次查询几十微秒，缓存纯属多余。连带
 *    `invalidateMirrorCache` 和「Cache API 没有全球 purge，只能按 60 秒承诺」
 *    那个妥协一起消失——登记/下线现在是**即时生效**的。
 *
 *    （对外仍是 60 秒口径：边缘函数那侧会缓存 /mirrors 响应 60 秒。承诺没变，
 *    只是把这层缓存挪到了它真正该在的地方。）
 *
 * 2. **探活更准了。** worker/src/mirrors.ts 的开头写着「校验要从本机直连国内网盘，
 *    放在境外边缘节点上跑既慢又测不准」——这正是登记校验被留在 scripts/mirror.mjs
 *    的原因。服务跑在香港 VPS 上，到国内网盘的链路比 CF 边缘接近真实用户得多，
 *    探活结果第一次称得上可信。
 */

const FETCH_TIMEOUT_MS = 12_000;
const PROBE_MAX_HOPS = 5;
/** 连续失败达到此值才自动下线，避免一次网络抖动就把镜像误伤掉。 */
const FAIL_THRESHOLD = 2;

/**
 * 当前启用的全部镜像，形如 { 对象名: 直链 }。
 *
 * 任何异常（表未建、库文件损坏）都返回空映射——调用方回落 R2 永远是安全的，
 * 绝不能让镜像层的问题变成下载不可用。这条不变量与 Worker 版完全一致。
 */
export async function enabledMirrors(db) {
  try {
    const { results } = await db
      .prepare("SELECT key, url FROM mirrors WHERE enabled = 1")
      .all();
    const map = {};
    for (const row of results ?? []) map[row.key] = row.url;
    return map;
  } catch (e) {
    console.error("读取 mirrors 失败，本次回落 R2：", e?.message ?? e);
    return {};
  }
}

// ── 定时探活 ────────────────────────────────────────────────────────────

/**
 * 对所有启用中的镜像跑一次可用性检查，连续失败达阈值则自动下线回落 R2。
 *
 * 只查 enabled 的行：已下线的镜像不会自动恢复——恢复应当是人确认网盘那边真的
 * 修好之后的显式动作（`pnpm mirror on <版本>`），自动来回切换只会让问题更难追。
 */
export async function checkAllMirrors(db) {
  let rows;
  try {
    const { results } = await db
      .prepare("SELECT * FROM mirrors WHERE enabled = 1")
      .all();
    rows = results ?? [];
  } catch (e) {
    console.error("探活取表失败：", e?.message ?? e);
    return [];
  }

  const outcomes = [];
  for (const row of rows) outcomes.push(await checkOne(db, row));
  return outcomes;
}

async function checkOne(db, row) {
  const now = new Date().toISOString();
  let ok = false;
  let status;

  try {
    const probe = await probeRange(row.url);
    if (probe.status !== 206) {
      status = `HTTP ${probe.status}`;
    } else if (probe.total !== row.size) {
      status = `大小变化 ${probe.total} ≠ ${row.size}`;
    } else {
      ok = true;
      status = "ok";
    }
  } catch (e) {
    status = `请求失败：${e instanceof Error ? e.message : String(e)}`;
  }

  const failCount = ok ? 0 : row.fail_count + 1;
  const disable = !ok && failCount >= FAIL_THRESHOLD;

  await db
    .prepare(
      `UPDATE mirrors
          SET fail_count = ?2, last_check = ?3, last_status = ?4,
              enabled = CASE WHEN ?5 = 1 THEN 0 ELSE enabled END
        WHERE key = ?1`,
    )
    .bind(
      row.key,
      failCount,
      now,
      disable ? `${status}（连续 ${failCount} 次失败，已自动下线）` : status,
      disable ? 1 : 0,
    )
    .run();

  return { key: row.key, ok, status, disabled: disable };
}

/**
 * 复刻客户端 `supports_ranges()` 的第一个动作：`Range: bytes=0-0`。
 * 逐跳跟随而不用 redirect: "follow"，是为了顺带数清跳数——客户端 ureq 的
 * redirects(3) 是硬上限，这条链路正是最容易顶满它的地方。
 */
async function probeRange(start) {
  let url = start;
  let hops = 0;

  while (hops <= PROBE_MAX_HOPS) {
    const res = await fetch(url, {
      method: "GET",
      headers: { range: "bytes=0-0" },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    // 只要头，不读 body
    res.body?.cancel().catch(() => {});

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { status: res.status, total: null, hops };
      url = new URL(loc, url).toString();
      hops++;
      continue;
    }
    return {
      status: res.status,
      total: parseContentRangeTotal(res.headers.get("content-range")),
      hops,
    };
  }
  return { status: 310, total: null, hops }; // 310 = 自定义「跳转过多」
}

/** 从 `bytes 0-0/19733303` 取出总长；总长为 `*` 或格式异常时返回 null。 */
function parseContentRangeTotal(header) {
  if (!header) return null;
  const m = /^bytes\s+\d+-\d+\/(\d+)$/i.exec(header.trim());
  return m ? Number(m[1]) : null;
}
