/**
 * 安装包下载：计数，然后 302 到实际出口（镜像优先，回落 R2 公共域）。
 *
 * 早期版本用 R2 binding 把字节流代理出去（env.BUCKET.get()）。那样做有个不易
 * 察觉的代价：**in-Worker 的 R2 API 直读存储，完全绕过 Cloudflare 边缘缓存**，
 * 于是每个用户、每次下载、每个分片都在跨洋回源拉同一个 20MB 文件。改成 302
 * 到配了 Cache Rule 的 R2 自定义域后，热文件由边缘直接命中，Worker 也不再
 * 扛字节流——两件事一次解决。
 */
import type { Env } from "./env";
import { parseArtifact } from "./env";
import { lookupMirror } from "./mirrors";

export async function handleDownload(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  key: string,
): Promise<Response> {
  const r2Url = `${env.R2_PUBLIC_BASE}/${encodeURIComponent(key)}`;

  // 路由是 /WindInput-* 一条通吃，发布说明（.md）与校验值（.sha256）也会到这里。
  // 它们不是安装包：不计数、不查镜像，直接放行回 R2。
  const artifact = parseArtifact(key);
  if (!artifact) return redirect(r2Url);

  const mirror = await lookupMirror(env, ctx, key);
  const target = mirror ?? r2Url;

  // 计数与响应解耦：waitUntil 后台写入，写失败也不影响下载。
  if (request.method === "GET" && isDownloadStart(request)) {
    ctx.waitUntil(
      bumpCount(env, artifact.version, artifact.platform, mirror ? "mirror" : "r2"),
    );
  }

  return redirect(target);
}

/**
 * 302 而非 301：镜像随时可能被下线回落 R2，而 301 会被浏览器长期记住，
 * 一旦发出就再也收不回来。no-store 同理，防止中间层缓存这次跳转决策。
 */
function redirect(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { location: url, "cache-control": "no-store" },
  });
}

/**
 * 是否算作「一次下载的起点」，用于计数。目标是让「浏览器点击下载」与「客户端在线更新」
 * 各恰好计 1 次。计以下两种请求：
 *
 * - **无 Range**：浏览器点击下载的首个请求；小安装包（<8MB）的在线更新走单连接下载也无
 *   Range。浏览器紧随的 `bytes=0-` 可续传请求不算，避免一次点击记 2 次。
 * - **恰好 `bytes=0-0`**：wind-setting 在线更新对 ≥8MB 的安装包，下载前必定发且只发一次
 *   `Range: bytes=0-0` 探测服务端是否支持分片；随后的分片 `bytes=X-Y` 不计。以此让
 *   「分片式在线更新」也计为 1 次下载（在线更新也是用户下载了一次）。
 *
 * 改 302 之后这个口径依然成立，前提是**镜像必须真支持 Range**：若探测拿不到 206，
 * 客户端会回退单连接再发一个无 Range 请求，一次更新就被计成 2 次。登记镜像时的
 * Range 校验（scripts/mirror.mjs）就是为了守住这个前提。
 */
function isDownloadStart(request: Request): boolean {
  const range = request.headers.get("range");
  if (range === null) return true;
  return range.trim() === "bytes=0-0";
}

/**
 * 双写：downloads 记总量（前端徽章数据源，含历史数据），download_events 记渠道。
 * batch 是一个事务，若 download_events 尚未建表会整体失败——那时降级为只写
 * downloads，保证「新表没建好」不会连总计数一起丢。
 */
async function bumpCount(
  env: Env,
  version: string,
  platform: string,
  source: "mirror" | "r2",
): Promise<void> {
  const now = new Date().toISOString();
  const total = env.DB.prepare(
    `INSERT INTO downloads (version, platform, count, updated_at)
     VALUES (?1, ?2, 1, ?3)
     ON CONFLICT(version, platform) DO UPDATE SET count = count + 1, updated_at = ?3`,
  ).bind(version, platform, now);

  const bySource = env.DB.prepare(
    `INSERT INTO download_events (version, platform, source, count, updated_at)
     VALUES (?1, ?2, ?3, 1, ?4)
     ON CONFLICT(version, platform, source) DO UPDATE SET count = count + 1, updated_at = ?4`,
  ).bind(version, platform, source, now);

  try {
    await env.DB.batch([total, bySource]);
  } catch (e) {
    console.error("分渠道计数写入失败，降级为只记总量", e);
    await total.run();
  }
}
