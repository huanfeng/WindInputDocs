/**
 * 清风输入法下载计数服务。
 *
 * 与 EdgeOne 边缘函数（edge/gateway.js）配合，替代原先跑在 Cloudflare 上的
 * 下载网关 Worker。分工是按**可降级性**切的，不是按组件切的：
 *
 *   边缘函数（多节点，高可用）  发 302 —— 挂了用户就下载不了，必须留在边缘
 *   本服务（单机，可降级）      计数、镜像数据源、探活 —— 挂了只丢计数
 *
 * 所以本服务**不在下载的关键路径上**：边缘函数拿不到 /mirrors 就回落 R2，
 * 上报计数失败就静默丢弃，两种情况用户都照常下载。这条边界不是新发明的，
 * 原 Worker 里 `ctx.waitUntil(bumpCount(...))` 就是它——只不过那时两侧在同一个
 * 进程里，现在跨了主机。
 *
 * 端点：
 *   GET  /healthz     存活检查
 *   GET  /mirrors     启用中的镜像映射，供边缘函数查询（公开，边缘侧缓存 60 秒）
 *   GET  /api/stats   下载量统计，供下载页徽章（公开）
 *   POST /count       计数上报（需令牌）
 *   POST /admin/sql   执行 SQL，供 worker/scripts/mirror.mjs 远程管理（需令牌）
 */
import { createServer } from "node:http";

import { resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { openDb } from "./db.mjs";
import { fallbackToR2, handleGateway } from "./gateway.mjs";
import { checkAllMirrors, enabledMirrors } from "./mirrors.mjs";
import { bumpCount, readStats } from "./stats.mjs";

const PORT = Number(process.env.PORT ?? 8080);
// 默认只听回环：公网入口应当是 EdgeOne 回源 → nginx/caddy → 本服务。
// 直接把 Node 服务暴露在公网上，等于把 /admin/sql 的防线全押在一个令牌上。
const HOST = process.env.HOST ?? "127.0.0.1";
const DB_PATH = resolve(process.env.DB_PATH ?? "./data/downloads.db");
const TOKEN = process.env.AUTH_TOKEN ?? "";
const PROBE_INTERVAL_MIN = Number(process.env.PROBE_INTERVAL_MIN ?? 10);
// 由本服务直接承担下载网关（发 302）。仅在 EdgeOne 边缘函数不可用时启用——
// 它会把 VPS 放进下载的关键路径，代价与配套措施见 gateway.mjs 顶部说明。
const GATEWAY_ENABLED = process.env.GATEWAY_ENABLED === "1";

if (!TOKEN) {
  console.error("缺少 AUTH_TOKEN 环境变量。没有它，计数端点会对全网开放——");
  console.error("任何人都能伪造下载量，而这个数字是要展示在下载页上的。");
  process.exit(1);
}

const db = openDb(DB_PATH);

/**
 * 把一段 SQL 拆成独立语句。与 worker/scripts/d1.mjs 的同名函数保持一致：
 * 只剔除**整行**以 `--` 开头的注释——按行内位置切会误伤 URL 里的 `--`。
 */
function splitStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 常数时间比较：令牌校验不该因为「前几个字符对了」而多花时间 */
function tokenOk(req) {
  const raw =
    req.headers["x-auth-token"] ??
    (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(String(raw));
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res, status, body, extraHeaders = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "content-type":
      typeof body === "string"
        ? "text/plain; charset=utf-8"
        : "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(payload);
}

async function readJsonBody(req, limit = 256 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // 计数上报是几十字节的小对象；超限说明不是正常调用方
    if (size > limit) throw new Error("请求体过大");
    chunks.push(chunk);
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;

  try {
    if (req.method === "GET" && path === "/healthz") {
      return send(res, 200, { ok: true });
    }

    // 边缘函数每 60 秒取一次（它那侧缓存）。max-age 与之对齐，
    // 中间若有反代也照同一口径缓存，不会出现两层缓存各自过期的错位。
    if (req.method === "GET" && path === "/mirrors") {
      return send(res, 200, await enabledMirrors(db), {
        "cache-control": "public, max-age=60",
      });
    }

    if (req.method === "GET" && path === "/api/stats") {
      return send(res, 200, await readStats(db), {
        "cache-control": "public, max-age=300",
        "access-control-allow-origin": "*",
      });
    }

    if (req.method === "POST" && path === "/count") {
      if (!tokenOk(req)) return send(res, 401, { error: "unauthorized" });

      const { version, platform, source } = await readJsonBody(req);
      if (!version || !platform) {
        return send(res, 400, { error: "version 与 platform 必填" });
      }
      // source 只有 mirror / r2 两种取值（见 schema.sql），别的一律归 r2，
      // 免得拼写错误在 download_events 里长出一个新渠道
      await bumpCount(db, version, platform, source === "mirror" ? "mirror" : "r2");
      return send(res, 204, "");
    }

    // 供 worker/scripts/mirror.mjs 远程执行镜像登记/上下线。
    //
    // 是的，这是个「执行任意 SQL」的端点。这么做是因为 mirror.mjs 的全部数据访问
    // 都收敛在一行 `const d1 = (sql) => runSql(sql)` 上——提供一个等价的远程执行器，
    // 那 521 行运维脚本一个字都不用改。写成一组 REST 资源反而要在两处重新实现
    // 登记校验的语义，是更大的改动面和更多的出错机会。
    //
    // 它替代的正是 wrangler CLI（那同样能对 D1 执行任意 SQL），风险等级没有升高。
    // 前提是令牌不泄露、且服务只听回环由反代转入——两条都写在 README 的部署步骤里。
    if (req.method === "POST" && path === "/admin/sql") {
      if (!tokenOk(req)) return send(res, 401, { error: "unauthorized" });

      const { sql } = await readJsonBody(req);
      if (typeof sql !== "string" || !sql.trim()) {
        return send(res, 400, { error: "sql 必填" });
      }

      // 输出与 `wrangler d1 execute --json` 对齐：一个数组，每条语句一项，
      // 调用方取最后一项的 results（见 worker/scripts/d1.mjs 的 runSql）。
      // 保持这个形状，那边的解析逻辑才能原样复用。
      const out = [];
      for (const one of splitStatements(sql)) {
        const stmt = db.raw.prepare(one);
        // reader 为真表示这条语句会返回行（SELECT 一类）；
        // 对 INSERT/UPDATE 调 all() 会抛「This statement does not return data」
        let results = [];
        if (stmt.reader) {
          results = stmt.all();
        } else {
          stmt.run();
        }
        out.push({ results, success: true });
      }
      return send(res, 200, out);
    }

    // 网关模式：上面的管理/统计端点都没匹配上，剩下的按下载域路径处理。
    // 放在最后是因为它会兜住一切路径——排在前面会把 /api/stats 也吃掉。
    if (GATEWAY_ENABLED && (req.method === "GET" || req.method === "HEAD")) {
      if (await handleGateway(db, req, res)) return;
      // 不是安装包也不是分发文件（.sha256 等）：放行回 R2
      return fallbackToR2(req, res);
    }

    return send(res, 404, { error: "not found" });
  } catch (e) {
    console.error(`${req.method} ${path} 失败：`, e?.message ?? e);
    return send(res, 500, { error: String(e?.message ?? e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`下载计数服务已启动 http://${HOST}:${PORT}  库：${DB_PATH}`);
});

// 定时探活。Worker 版用 Cron 触发器，这里用进程内定时器——服务本就常驻，
// 再引一套外部调度只是多一个会失联的部件。
const probeTimer = setInterval(
  async () => {
    const outcomes = await checkAllMirrors(db);
    for (const o of outcomes) {
      if (!o.ok) console.warn(`镜像探活失败 ${o.key}：${o.status}`);
      if (o.disabled) console.error(`镜像已自动下线 ${o.key}`);
    }
  },
  PROBE_INTERVAL_MIN * 60 * 1000,
);
// 探活不该拖住进程退出
probeTimer.unref();

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.log(`收到 ${sig}，正在关闭…`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
