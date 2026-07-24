/**
 * 清风输入法下载网关 Worker
 *
 * 绑定 dl.windinput.com（原为 R2 自定义域，现改为本 Worker 的自定义域）。
 * 下载 URL 与文件名完全不变，只是这个域名背后从「R2 直连」换成「Worker 绑定 R2」。
 *
 * 职责：
 *   1. GET /<文件名>   —— 从 R2 取对象返回（支持 Range 续传 / 条件请求），
 *                        并在「下载起始请求」时给对应版本计数 +1。
 *   2. GET /api/stats  —— 返回 JSON：{ total, versions[] }，供下载页展示。
 *
 * 计数口径：只统计「下载起始请求」（无 Range 头，或 Range 从 0 开始且非 1 字节探测），
 * 避免下载器分段 / 续传把一次下载计成多次。这是尽力而为的近似值——不依赖 Cookie /
 * 指纹，无法做到按人精确去重，用于「大致了解各版本下载量」足够。
 */

interface Env {
  BUCKET: R2Bucket;
  DB: D1Database;
}

// 只有安装包文件名才参与计数与强制下载；版本号 = 捕获组 1。
// 与主仓打包脚本一致：WindInput-Setup-<版本>.exe
const SETUP_RE = /^WindInput-Setup-(.+)\.exe$/;

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-max-age": "86400",
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/stats") {
      return handleStats(request, env, ctx);
    }

    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key) {
      return new Response("Not Found", { status: 404 });
    }

    if (request.method === "HEAD") {
      return handleHead(env, key);
    }
    if (request.method === "GET") {
      return handleDownload(request, env, ctx, key);
    }
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  },
} satisfies ExportedHandler<Env>;

async function handleHead(env: Env, key: string): Promise<Response> {
  const object = await env.BUCKET.head(key);
  if (object === null) {
    return new Response(null, { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("content-length", String(object.size));
  return new Response(null, { status: 200, headers });
}

async function handleDownload(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  key: string,
): Promise<Response> {
  const object = await env.BUCKET.get(key, {
    onlyIf: request.headers,
    range: request.headers,
  });

  if (object === null) {
    return new Response("Object Not Found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");

  const setup = SETUP_RE.exec(key);
  if (setup) {
    // 强制以附件下载，避免个别浏览器尝试内联打开 .exe
    headers.set("content-disposition", `attachment; filename="${key}"`);
  }

  // 条件请求（If-None-Match 等）未命中：R2 返回无 body 的对象，回 412
  if (!("body" in object)) {
    return new Response(undefined, { status: 412, headers });
  }

  const hasRange = request.headers.get("range") !== null;
  let status = 200;

  if (hasRange && object.range) {
    const { start, end } = resolveRange(object.range, object.size);
    headers.set("content-range", `bytes ${start}-${end}/${object.size}`);
    headers.set("content-length", String(end - start + 1));
    status = 206;
  } else {
    headers.set("content-length", String(object.size));
  }

  // 计数与响应解耦：用 waitUntil 后台写入，写失败也不影响下载。
  if (setup && status !== 412 && isDownloadStart(request)) {
    ctx.waitUntil(bumpCount(env, setup[1]));
  }

  return new Response(object.body, { status, headers });
}

/** 把 R2 返回的 range 归一成 [start, end] 闭区间（字节，含端点）。 */
function resolveRange(
  range: R2Range,
  size: number,
): { start: number; end: number } {
  if ("suffix" in range) {
    return { start: Math.max(0, size - range.suffix), end: size - 1 };
  }
  const start = range.offset ?? 0;
  const length = range.length ?? size - start;
  return { start, end: start + length - 1 };
}

/**
 * 是否算作「一次下载的起点」：只统计完全不带 Range 的请求。
 *
 * 浏览器点击下载的首个请求不带 Range，计 1 次即可。带 Range 的请求一律不计——
 * 它们要么是下载器的分段/续传，要么是浏览器紧随首个请求发出的可续传二次请求
 * （`Range: bytes=0-`）。早期把 `bytes=0-` 也计入，导致一次点击被记成 2 次。
 */
function isDownloadStart(request: Request): boolean {
  return request.headers.get("range") === null;
}

async function bumpCount(env: Env, version: string): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO downloads (version, count, updated_at)
     VALUES (?1, 1, ?2)
     ON CONFLICT(version) DO UPDATE SET count = count + 1, updated_at = ?2`,
  )
    .bind(version, now)
    .run();
}

async function handleStats(
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
    "SELECT version, count FROM downloads ORDER BY count DESC",
  ).all<{ version: string; count: number }>();

  const versions = results ?? [];
  const total = versions.reduce((sum, r) => sum + r.count, 0);

  const response = new Response(JSON.stringify({ total, versions }), {
    headers: {
      ...CORS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
