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
 *
 * 3. **探活范围与「最新版本自动恢复」搬自 worker/src/mirrors.ts 的同名逻辑**——
 *    旧版本下线不再探（需要人 `pnpm mirror on` 手动确认），最新版本持续探、
 *    成功就自动重新启用；最新版本判定同样不引入配置项，直接从 mirrors 表
 *    自己的 key 里取最大版本号。
 */
import { parseArtifact } from "./artifacts.mjs";

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
 * 探活范围：启用中的镜像照常探（可能因失败下线）；已停用的镜像默认不再探——
 * 「下线不自动恢复」是刻意设计，见 checkOne 顶部。唯一例外是**最新版本**：
 * 它的下载最集中，网盘抖动一次就要等人工巡检才能恢复，等不起。
 *
 * 「最新版本」不新增配置项——那只会重蹈这次的覆辙（需要人在每次发版时记得
 * 同步一个数字，忘了就是这次的下线好几天没人发现）。改从 mirrors 表自己的
 * key 推：所有已登记对象名解析出的版本号取最大值，谁登记了新版本的镜像，
 * 「最新」就自动跟着往前挪一格，不需要另一处手动维护。与 worker/src/mirrors.ts
 * 的同名逻辑保持一致。
 */
export async function checkAllMirrors(db) {
  let rows;
  try {
    const { results } = await db.prepare("SELECT * FROM mirrors").all();
    rows = results ?? [];
  } catch (e) {
    console.error("探活取表失败：", e?.message ?? e);
    return [];
  }

  const latest = latestVersion(rows);
  const targets = rows.filter(
    (r) => r.enabled === 1 || parseArtifact(r.key)?.version === latest,
  );

  const outcomes = [];
  for (const row of targets) {
    outcomes.push(await checkOne(db, row, parseArtifact(row.key)?.version === latest));
  }
  return outcomes;
}

/** 已登记镜像里版本号最大的那个（数字段逐段比较）。表空则 null。 */
function latestVersion(rows) {
  let best = null;
  for (const row of rows) {
    const v = parseArtifact(row.key)?.version;
    if (v && (best === null || compareVersions(v, best) > 0)) best = v;
  }
  return best;
}

/** 数字段逐段比较，如 `0.119.0` vs `0.13.1-alpha`；预发布后缀视为比同号正式版低。 */
function compareVersions(a, b) {
  const parse = (v) => {
    const [core, pre] = v.split("-", 2);
    return { nums: core.split(".").map(Number), pre: pre ?? null };
  };
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.nums.length, pb.nums.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null) return 1; // 正式版 > 预发布
  if (pb.pre === null) return -1;
  return pa.pre < pb.pre ? -1 : 1;
}

/**
 * 恢复应当是人确认网盘那边真的修好之后的显式动作（`pnpm mirror on <对象名>`），
 * 自动来回切换只会让问题更难追——这条不变量对**非最新版本**依然成立：
 * 它们下线之后不会被探活碰到（见 checkAllMirrors 的 targets 过滤），需要人手动处理。
 *
 * 最新版本是这条不变量刻意开的口子：它一直在被探，失败达阈值只是「关」，
 * 一旦下次探活成功就自动「开」回来，不等人巡检——发布初期这几分钟等不起。
 */
async function checkOne(db, row, isLatest) {
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

  const wasEnabled = row.enabled === 1;
  const recovered = ok && !wasEnabled;
  const failCount = ok ? 0 : row.fail_count + 1;
  const hitsThreshold = wasEnabled && !ok && failCount >= FAIL_THRESHOLD;

  // 非最新版本一旦触发下线阈值，直接删行而不是停用——旧版本失效是预期状态，
  // 不会再有人巡检，留一条停用记录只会让 mirror ls 越滚越长。最新版本走不到
  // 这个分支（isLatest 时下面保留该行，好让它继续被探、能自动恢复）。
  if (hitsThreshold && !isLatest) {
    await db.prepare("DELETE FROM mirrors WHERE key = ?1").bind(row.key).run();
    return { key: row.key, ok, status, disabled: false, recovered: false, deleted: true };
  }

  const nextEnabled = ok ? 1 : hitsThreshold ? 0 : row.enabled;

  await db
    .prepare(
      `UPDATE mirrors
          SET fail_count = ?2, last_check = ?3, last_status = ?4, enabled = ?5
        WHERE key = ?1`,
    )
    .bind(
      row.key,
      failCount,
      now,
      recovered
        ? "ok（探活恢复，已自动重新启用）"
        : hitsThreshold
          ? `${status}（连续 ${failCount} 次失败，已自动下线）`
          : status,
      nextEnabled,
    )
    .run();

  return { key: row.key, ok, status, disabled: hitsThreshold, recovered, deleted: false };
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
