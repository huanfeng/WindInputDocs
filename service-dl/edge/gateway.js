/**
 * 清风输入法下载网关 —— EdgeOne 边缘函数版。
 *
 * 替代原先跑在 Cloudflare 上的 windinput-dl Worker。职责与它完全一致：
 *   1. GET /<安装包>  —— 计数，然后 302 到实际出口（镜像优先，回落 R2）
 *   2. GET /api/stats —— 下载量统计，供下载页徽章
 *   3. latest.json / <版本>-Release.md —— 转到文档站产物（它们已不在 R2 上）
 *
 * 这里**不代理字节流**，只发 302。Worker 版就是这么设计的，那次改造（从 R2
 * binding 直读改成 302）恰好也买下了这次迁移的可行性：一个不扛数据的网关，
 * 换个平台只是换个发 302 的地方。
 *
 * ── 与 Worker 版的关键差异 ──────────────────────────────────────────────
 *
 * 计数不再是进程内的一次 D1 写，而是跨主机 POST 到 service-dl。边界没变——
 * 原来那句 `ctx.waitUntil(bumpCount(...))` 表达的就是「计数与响应解耦，写失败
 * 也不影响下载」，现在只是两侧跑在不同机器上。上报失败静默丢弃，用户照常下载。
 *
 * 镜像映射改从 service-dl 拉取并缓存 60 秒。Worker 版用 Cache API 缓存整表也是
 * 60 秒（MIRROR_CACHE_TTL），对外「改动最多 60 秒生效」的承诺一字未变。
 *
 * ── 部署前必改 ─────────────────────────────────────────────────────────
 *
 * SERVICE_BASE / SERVICE_TOKEN 两项。EdgeOne 站点加速的边缘函数没有环境变量
 * 注入，只能写在代码里——函数代码不对外公开，但请勿把本文件的**已填版本**提交
 * 进仓库。仓库里保留占位符，填好的那份只存在于 EdgeOne 控制台。
 */

/** service-dl 的公网入口（经反代），不含结尾斜杠 */
const SERVICE_BASE = "https://__FILL_ME__";
/** 与 service-dl 的 AUTH_TOKEN 一致 */
const SERVICE_TOKEN = "__FILL_ME__";
/** R2 纯出口（配了缓存规则的那个域），302 的兜底目标 */
const R2_PUBLIC_BASE = "https://r2.windinput.com";
/** 文档站，latest.json 与发布说明现在由它产出 */
const DOCS_BASE = "https://windinput.com";

/** 镜像映射的边缘缓存时长（秒）。与 service-dl 的 /mirrors 响应 max-age 对齐。 */
const MIRROR_TTL = 60;

/**
 * 安装包命名口径。与 worker/src/env.ts 的 ARTIFACTS 保持一致——
 * **加平台只需在这里加一行**，计数、分流两处都会自动跟上。
 *
 * 不匹配任何一条的对象（.sha256 等）不计数、不查镜像，直接 302 回 R2。
 */
const ARTIFACTS = [
  { re: /^WindInput-Setup-(.+)\.exe$/i, platform: "windows" },
  { re: /^WindInput-Portable-(.+)\.zip$/i, platform: "windows-portable" },
  { re: /^WindInput-(.+)-macOS\.pkg$/i, platform: "macos" },
];

function parseArtifact(key) {
  for (const { re, platform } of ARTIFACTS) {
    const m = re.exec(key);
    if (m) return { version: m[1], platform };
  }
  return null;
}

/**
 * 是否算作「一次下载的起点」。目标是让「浏览器点击下载」与「客户端在线更新」
 * 各恰好计 1 次：
 *
 * - **无 Range**：浏览器点击下载的首个请求；小安装包的在线更新走单连接也无 Range。
 * - **恰好 bytes=0-0**：客户端对 ≥8MB 的包在下载前必发且只发一次的分片探测。
 *
 * 这一版比 Worker 版更准：边缘函数读到的是**用户的原始 Range 头**，
 * 而 Worker 版隔着 EdgeOne 回源，中间任何一层改写 Range 都会让口径失真。
 */
function isDownloadStart(request) {
  const range = request.headers.get("range");
  if (range === null) return true;
  return range.trim() === "bytes=0-0";
}

/**
 * 302 而非 301：镜像随时可能被探活下线回落 R2，而 301 会被浏览器长期记住，
 * 一旦发出就再也收不回来。no-store 同理，防止中间层缓存这次跳转决策。
 */
function redirect(url) {
  return new Response(null, {
    status: 302,
    headers: { location: url, "cache-control": "no-store" },
  });
}

/**
 * 取启用中的镜像映射，带 60 秒边缘缓存。
 *
 * 任何异常都返回空映射——回落 R2 永远是安全的，绝不能让镜像层（或 service-dl
 * 掉线）变成下载不可用。这条不变量从 Worker 版一路继承下来，是本网关最重要的
 * 一条：service-dl 是单机，它必须**不在下载的关键路径上**。
 */
async function loadMirrors(event) {
  const cacheKey = new Request(`${SERVICE_BASE}/mirrors`);

  try {
    const hit = await caches.default.match(cacheKey);
    if (hit) return await hit.json();
  } catch {
    // 边缘缓存不可用就直接回源，功能不受影响，只是每次多一跳
  }

  try {
    const res = await fetch(cacheKey, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return {};

    const body = await res.text();
    try {
      const cached = new Response(body, {
        headers: {
          "content-type": "application/json",
          "cache-control": `max-age=${MIRROR_TTL}`,
        },
      });
      event.waitUntil(caches.default.put(cacheKey, cached));
    } catch {
      // 同上：缓存写不进去不影响本次结果
    }
    return JSON.parse(body);
  } catch {
    // 超时或 service-dl 掉线：本次回落 R2，且**不缓存这个失败结果**——
    // 否则一次抖动会让整个节点接下来 60 秒都吃不到镜像
    return {};
  }
}

/** 上报一次下载。失败静默——计数丢了是可接受的，下载失败不是。 */
async function reportCount(version, platform, source) {
  try {
    await fetch(`${SERVICE_BASE}/count`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-auth-token": SERVICE_TOKEN,
      },
      body: JSON.stringify({ version, platform, source }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // 静默
  }
}

async function handleRequest(event) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  // 统计接口：回源 service-dl。它给的响应自带 max-age=300，EdgeOne 照此缓存，
  // 所以下载页的访问量不会 1:1 打到服务上。
  if (url.pathname === "/api/stats") {
    try {
      return await fetch(`${SERVICE_BASE}/api/stats`, {
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // 服务掉线时给一份空统计而不是 5xx：徽章不显示远好过下载页报错。
      // 前端 download-stats.tsx 本就对失败静默降级。
      return new Response(JSON.stringify({ total: 0, versions: [] }), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*",
        },
      });
    }
  }

  const key = decodeURIComponent(url.pathname.slice(1));
  if (!key) return new Response("Not Found", { status: 404 });

  // latest.json 与发布说明已挪进文档站产物（见 scripts/gen-dist-files.mjs）。
  // 对外 URL 保持不变——老客户端里这两个地址是硬编码的，改域名等于把存量用户的
  // 在线更新一次性切断。这里做的是「同一个地址，换个后端」。
  if (key === "latest.json" || /^WindInput-.+-Release\.md$/i.test(key)) {
    return fetch(`${DOCS_BASE}/${key}`, {
      headers: request.headers,
    });
  }

  const r2Url = `${R2_PUBLIC_BASE}/${encodeURIComponent(key)}`;

  // 不是安装包（.sha256 等）：不计数、不查镜像，直接放行回 R2
  const artifact = parseArtifact(key);
  if (!artifact) return redirect(r2Url);

  const mirrors = await loadMirrors(event);
  const mirror = mirrors[key] ?? null;
  const target = mirror ?? r2Url;

  // 计数与响应解耦：后台上报，写失败也不影响下载
  if (request.method === "GET" && isDownloadStart(request)) {
    event.waitUntil(
      reportCount(artifact.version, artifact.platform, mirror ? "mirror" : "r2"),
    );
  }

  return redirect(target);
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});
