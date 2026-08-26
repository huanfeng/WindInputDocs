/**
 * 下载网关的**服务端版本**——与 edge/gateway.js 同一套逻辑，跑在 VPS 上。
 *
 * 为什么有两份实现：EdgeOne 的边缘函数在免费套餐里属于限量内测，可能一时开通不了。
 * 没有它，`dl.windinput.com` 就只能回源到某个源站——那个源站要么是 CF（没摆脱），
 * 要么是本服务。这份代码让第二条路可行。
 *
 * ⚠️ **两者不是平级的备选，优先用边缘函数。**
 *
 * 边缘函数是多节点的，本服务是单机。用本服务当网关，等于把 VPS 放进下载的关键
 * 路径——它一挂，用户就下载不了，而不再是「只丢计数」。整套架构按可降级性切分的
 * 前提在这一刻消失了。
 *
 * 所以启用它时**务必在 EdgeOne 侧配回源故障转移**，备用源站指向 R2 公共域：
 * 本服务挂掉时请求直接落到 R2，用户拿到的是不带镜像分流的原始下载——慢，但活着。
 * 配好这一条，单点风险就退回到「镜像分流失效」，与 mirrors 表读不到是同一级别。
 *
 * 默认不启用，需显式设 GATEWAY_ENABLED=1。
 */
import { bumpCount } from "./stats.mjs";
import { enabledMirrors } from "./mirrors.mjs";

const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE ?? "https://r2.windinput.com";
const DOCS_BASE = process.env.DOCS_BASE ?? "https://windinput.com";

/**
 * 安装包命名口径。与 worker/src/env.ts 的 ARTIFACTS、edge/gateway.js 的同名常量
 * 三处一致——**加平台要三处一起加**。分散是部署形态决定的（一份跑在边缘、一份
 * 跑在这里、一份是待退役的 Worker），不是遗漏。
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
 * 是否算作「一次下载的起点」。口径与 Worker 版完全一致：无 Range（浏览器点击、
 * 小包单连接更新），或恰好 bytes=0-0（客户端对大包的分片探测，必发且只发一次）。
 */
function isDownloadStart(req) {
  const range = req.headers.range;
  if (range === undefined) return true;
  return String(range).trim() === "bytes=0-0";
}

/**
 * 处理一个下载域请求；不归本网关管的路径返回 false，交回调用方。
 *
 * 302 而非 301：镜像随时可能被探活下线回落 R2，而 301 会被浏览器长期记住，
 * 一旦发出就再也收不回来。
 */
export async function handleGateway(db, req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const key = decodeURIComponent(url.pathname.slice(1));
  if (!key) return false;

  // latest.json 与发布说明现在是文档站的构建产物。对外 URL 保持不变——
  // 老客户端里这两个地址是硬编码的。这里做的是「同一个地址，换个后端」。
  if (key === "latest.json" || /^WindInput-.+-Release\.md$/i.test(key)) {
    res.writeHead(302, {
      location: `${DOCS_BASE}/${key}`,
      // 短缓存而非 no-store：这个跳转目标是稳定的，但别让它被长期记住，
      // 万一日后再换后端还能收回来
      "cache-control": "public, max-age=300",
    });
    res.end();
    return true;
  }

  const artifact = parseArtifact(key);
  if (!artifact) return false; // .sha256 等：交回调用方按「回落 R2」处理

  let target = `${R2_PUBLIC_BASE}/${encodeURIComponent(key)}`;
  let source = "r2";
  try {
    const mirror = (await enabledMirrors(db))[key];
    if (mirror) {
      target = mirror;
      source = "mirror";
    }
  } catch {
    // 查不到镜像就回落 R2——这条不变量比镜像分流本身重要得多
  }

  // 计数与响应解耦：先把 302 发出去，计数在后台补。
  // 跑在同一进程里，这一步比边缘函数版更省——不必跨主机上报。
  if (req.method === "GET" && isDownloadStart(req)) {
    // 刻意不 await：计数写盘再慢也不该让用户多等一毫秒
    bumpCount(db, artifact.version, artifact.platform, source).catch((e) => {
      console.error("计数失败（不影响下载）：", e?.message ?? e);
    });
  }

  res.writeHead(302, { location: target, "cache-control": "no-store" });
  res.end();
  return true;
}

/** 不匹配任何规则的下载域路径：直接放行回 R2，不计数、不查镜像。 */
export function fallbackToR2(req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const key = decodeURIComponent(url.pathname.slice(1));
  res.writeHead(302, {
    location: `${R2_PUBLIC_BASE}/${encodeURIComponent(key)}`,
    "cache-control": "no-store",
  });
  res.end();
}
