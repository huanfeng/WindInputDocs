/**
 * 清风输入法下载网关 Worker
 *
 * 绑定 dl.windinput.com 上的两条窄路由（安装包 + /api/*），其余路径由 R2 自定义域
 * 直接响应、不唤起 Worker。下载 URL 与文件名对外始终不变。
 *
 * 职责：
 *   1. GET /<安装包>  —— 计数，然后 302 到实际出口：
 *                        已登记镜像 → 国内网盘直链；否则 → R2 公共域（带边缘缓存）。
 *   2. GET /api/stats —— 返回 { total, versions[], sources }，供下载页展示。
 *   3. Cron           —— 定时探活镜像，连续失败自动下线回落 R2。
 *
 * 这里**不再代理字节流**。早先用 R2 binding 直读对象再写回响应，看似只是多一跳，
 * 实际代价是绕过了 Cloudflare 边缘缓存（in-Worker 的 R2 API 直连存储），每个用户、
 * 每个分片都在跨洋回源同一个 20MB 文件。改成 302 之后 Worker 只发「票」不扛货，
 * 字节流交给配了 Cache Rule 的 R2 公共域或国内镜像。
 *
 * 计数口径：只统计「下载起始请求」（无 Range，或恰好 bytes=0-0 的分片探测），
 * 避免下载器分段 / 续传把一次下载计成多次。尽力而为的近似值——不依赖 Cookie /
 * 指纹，无法按人精确去重，用于「大致了解各版本下载量」足够。
 */
import { handleDownload } from "./download";
import type { Env } from "./env";
import { checkAllMirrors } from "./mirrors";
import { handleStats } from "./stats";

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

    // HEAD 与 GET 同样 302（客户端自会跟随），差别只在 HEAD 不计数
    if (request.method === "GET" || request.method === "HEAD") {
      return handleDownload(request, env, ctx, key);
    }
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  },

  async scheduled(_event, env, ctx): Promise<void> {
    ctx.waitUntil(
      checkAllMirrors(env).then((outcomes) => {
        // 输出到 Workers 日志（observability 已开），下线事件在这里留痕
        for (const o of outcomes) {
          if (!o.ok) console.warn(`镜像探活失败 ${o.key}：${o.status}`);
          if (o.disabled) console.error(`镜像已自动下线 ${o.key}`);
        }
      }),
    );
  },
} satisfies ExportedHandler<Env>;
