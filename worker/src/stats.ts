/**
 * GET /api/stats —— 下载量统计，供文档站下载页展示。
 *
 * 对外的 { total, versions } 结构保持不变（前端 download-stats.tsx 依赖它）：
 * versions 按版本**跨平台聚合**，所以新增 macOS 之后下载页无需改动，徽章显示的
 * 仍是「这个版本被下载了多少次」。platforms / sources 是新增的自用维度。
 */
import type { Env } from "./env";

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-max-age": "86400",
};

export async function handleStats(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { ...CORS, Allow: "GET, OPTIONS" },
    });
  }

  // 边缘缓存：命中则直接返回，不再查 D1。下载页每次访问都会拉一次 stats，
  // 没有这层缓存，页面流量会 1:1 打到 D1 读上。计数略有延迟（≤5 分钟）无妨。
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const { results } = await env.DB.prepare(
    "SELECT version, SUM(count) AS count FROM downloads GROUP BY version ORDER BY count DESC",
  ).all<{ version: string; count: number }>();

  const versions = results ?? [];
  const total = versions.reduce((sum, r) => sum + r.count, 0);

  // 平台与渠道分布都是附加信息，查不到不该拖垮 stats
  const platforms = await sumBy(env, "SELECT platform AS k, SUM(count) AS v FROM downloads GROUP BY platform");
  const sources = await sumBy(env, "SELECT source AS k, SUM(count) AS v FROM download_events GROUP BY source");

  const response = new Response(JSON.stringify({ total, versions, platforms, sources }), {
    headers: {
      ...CORS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function sumBy(env: Env, sql: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const { results } = await env.DB.prepare(sql).all<{ k: string; v: number }>();
    for (const row of results ?? []) out[row.k] = row.v;
  } catch {
    // 表还没建好等情况：返回空对象，不影响主字段
  }
  return out;
}
