/**
 * 镜像映射的运行时部分：热路径读取（下载时查一次）与 Cron 探活。
 *
 * 登记 / 校验不在这里——那是 scripts/mirror.mjs 的活。校验要从本机直连国内网盘，
 * 放在境外边缘节点上跑既慢又测不准（Worker 到国内的链路和用户到国内的链路完全不同）。
 *
 * 背景：R2 在境外，部分用户下载极慢。国内网盘可手动上传拿到直链，于是让下载网关
 * 在计数之后 302 到该直链；未登记 / 已停用的版本仍走 R2。
 */
import { parseArtifact } from "./env";
import type { Env } from "./env";

const FETCH_TIMEOUT_MS = 12_000;
const PROBE_MAX_HOPS = 5;
/** 连续失败达到此值才自动下线，避免一次网络抖动就把镜像误伤掉。 */
const FAIL_THRESHOLD = 2;

// 边缘缓存热路径读取：每次安装包下载都要查一次映射，直连 D1 会把 D1 读额度和
// 一次往返延迟绑到下载路径上。表极小（几行），整表缓存最省。
const MIRROR_CACHE_URL = "https://dl.windinput.com/__internal/mirrors";
const MIRROR_CACHE_TTL = 60;

export interface MirrorRow {
  /** 完整对象名，如 WindInput-Setup-0.115.1.exe */
  key: string;
  url: string;
  size: number;
  enabled: number;
  fail_count: number;
  last_check: string | null;
  last_status: string | null;
  updated_at: string | null;
}

/**
 * 查某个对象当前启用的镜像地址，无则返回 null（调用方回落 R2）。
 *
 * 按对象名而非版本号索引：镜像是「一个文件 ↔ 一个直链」的映射，与版本/平台
 * 语义无关，这样新增平台或产物类型时这里不用改。
 *
 * 任何异常（表未建、D1 故障）都当作「无镜像」——回落 R2 永远是安全的，
 * 绝不能让镜像层的问题变成下载不可用。
 */
export async function lookupMirror(
  env: Env,
  ctx: ExecutionContext,
  key: string,
): Promise<string | null> {
  const map = await loadEnabledMirrors(env, ctx);
  return map[key] ?? null;
}

async function loadEnabledMirrors(
  env: Env,
  ctx: ExecutionContext,
): Promise<Record<string, string>> {
  const cache = caches.default;
  const cacheKey = new Request(MIRROR_CACHE_URL);
  const hit = await cache.match(cacheKey);
  if (hit) {
    try {
      return (await hit.json()) as Record<string, string>;
    } catch {
      // 缓存内容损坏：当没命中处理，下面重新查库
    }
  }

  const map: Record<string, string> = {};
  try {
    const { results } = await env.DB.prepare(
      "SELECT key, url FROM mirrors WHERE enabled = 1",
    ).all<{ key: string; url: string }>();
    for (const row of results ?? []) map[row.key] = row.url;
  } catch (e) {
    // 不缓存失败结果：D1 短暂故障不该让这个 colo 整整 60 秒都吃不到镜像
    console.error("读取 mirrors 失败，本次回落 R2", e);
    return {};
  }

  const cached = new Response(JSON.stringify(map), {
    headers: {
      "content-type": "application/json",
      "cache-control": `max-age=${MIRROR_CACHE_TTL}`,
    },
  });
  ctx.waitUntil(cache.put(cacheKey, cached));
  return map;
}

/**
 * 作废本 colo 的映射缓存。Cache API 没有全球 purge，所以这只能让**当前数据中心**
 * 立刻生效；其余节点仍要等 MIRROR_CACHE_TTL 自然过期。因此对外一律按
 * 「改动最多 60 秒生效」承诺，不要指望它能做到即时。
 */
async function invalidateMirrorCache(): Promise<void> {
  try {
    await caches.default.delete(new Request(MIRROR_CACHE_URL));
  } catch {
    // 删缓存失败无所谓，最多等 TTL 自然过期
  }
}

// ── Cron 探活 ───────────────────────────────────────────────────────────

export interface CheckOutcome {
  key: string;
  ok: boolean;
  status: string;
  disabled: boolean;
  recovered: boolean;
  deleted: boolean;
}

/**
 * 探活范围：启用中的镜像照常探（可能因失败下线）；已停用的镜像默认不再探——
 * 「下线不自动恢复」是刻意设计，见 checkOne 顶部。唯一例外是**最新版本**：
 * 它的下载最集中，网盘抖动一次就要等人工巡检才能恢复，等不起。
 *
 * 「最新版本」不新增配置项——那只会重蹈这次的覆辙（需要人在每次发版时记得
 * 同步一个数字，忘了就是这次的下线好几天没人发现）。改从 mirrors 表自己的
 * key 推：所有已登记对象名解析出的版本号取最大值，谁登记了新版本的镜像，
 * 「最新」就自动跟着往前挪一格，不需要另一处手动维护。
 */
export async function checkAllMirrors(env: Env): Promise<CheckOutcome[]> {
  let rows: MirrorRow[];
  try {
    const { results } = await env.DB.prepare("SELECT * FROM mirrors").all<MirrorRow>();
    rows = results ?? [];
  } catch (e) {
    console.error("探活取表失败", e);
    return [];
  }

  const latest = latestVersion(rows);
  const targets = rows.filter(
    (r) => r.enabled === 1 || parseArtifact(r.key)?.version === latest,
  );

  const outcomes: CheckOutcome[] = [];
  for (const row of targets) {
    outcomes.push(await checkOne(env, row, parseArtifact(row.key)?.version === latest));
  }
  if (outcomes.some((o) => o.disabled || o.recovered || o.deleted)) {
    await invalidateMirrorCache();
  }
  return outcomes;
}

/** 已登记镜像里版本号最大的那个（数字段逐段比较）。表空则 null。 */
function latestVersion(rows: MirrorRow[]): string | null {
  let best: string | null = null;
  for (const row of rows) {
    const v = parseArtifact(row.key)?.version;
    if (v && (best === null || compareVersions(v, best) > 0)) best = v;
  }
  return best;
}

/** 数字段逐段比较，如 `0.119.0` vs `0.13.1-alpha`；预发布后缀视为比同号正式版低。 */
function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
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
async function checkOne(
  env: Env,
  row: MirrorRow,
  isLatest: boolean,
): Promise<CheckOutcome> {
  const now = new Date().toISOString();
  let ok = false;
  let status: string;

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
  // 不会再有人巡检，留一条停用记录只会让 mirror ls 越滚越长。最新版本这里
  // 走不到（isLatest 时下面分支保留该行，好让它继续被探、能自动恢复）。
  if (hitsThreshold && !isLatest) {
    await env.DB.prepare("DELETE FROM mirrors WHERE key = ?1").bind(row.key).run();
    return { key: row.key, ok, status, disabled: false, recovered: false, deleted: true };
  }

  const nextEnabled = ok ? 1 : hitsThreshold ? 0 : row.enabled;

  await env.DB.prepare(
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
async function probeRange(
  start: string,
): Promise<{ status: number; total: number | null; hops: number }> {
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
function parseContentRangeTotal(header: string | null): number | null {
  if (!header) return null;
  const m = /^bytes\s+\d+-\d+\/(\d+)$/i.exec(header.trim());
  return m ? Number(m[1]) : null;
}
