#!/usr/bin/env node
/**
 * 构建前拉取「不进版本库的静态资源」。
 *
 * 目前只有收款码。它不进 git 的理由没变——收款码是个人支付凭证，一旦 commit
 * 就永久留在公开的 git 历史里，之后换码也撤不掉。变的是取用方式：从前由前端在
 * 运行时直连 R2，现在改为构建期拉一次、随站点产物一起部署。
 *
 * 这么改是因为运行时直连 R2 意味着**每个访客都要能访问 R2**，而 R2 在部分区域
 * 完全不可达——赞助页在那些地方就是两个破图。构建期拉取把这个要求降到「CI 能
 * 访问一次源」，代价只是换码后要重新部署一次（收款码几乎不变，这个代价可忽略）。
 *
 * 源可通过 ASSET_SOURCE_BASE 覆盖，默认仍是 R2 —— 图片已经在那儿，且构建跑在
 * 境外 CI 上，取用没有障碍。日后源站迁走时改这一个环境变量即可，不用动代码。
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.ASSET_SOURCE_BASE ?? "https://dl.windinput.com";
const RETRIES = 3;

/**
 * 要拉取的资源：远端路径 → 站内路径（相对 public/）。
 *
 * 站内路径与 src/lib/sponsor.ts 里 paymentMethods 的 key 一一对应，
 * 改这里记得同步改那边 —— 只有两条，不值得为它们引入一层共享清单。
 *
 * 落在 assets/ 下而不是 sponsor/：站点已有 /sponsor 页面路由，Next 会在
 * out/sponsor/ 下生成该页的 RSC 产物。两者混在一个目录里文件不冲突，但
 * edgeone.json 想给收款码配长缓存时，`/sponsor/*` 会连那些**文件名不带 hash 的**
 * RSC 文件一起匹配到——页面改版后访客会拿着旧 payload 直到缓存过期。
 * 单独开一层目录，缓存规则就能精确到「构建期拉来的外部资源」这一类。
 */
const ASSETS = [
  { remote: "sponsor/alipay.png", local: "assets/qr/alipay.png" },
  { remote: "sponsor/wechat.png", local: "assets/qr/wechat.png" },
];

async function download(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) throw new Error("空响应");
      return buf;
    } catch (e) {
      lastError = e;
      if (attempt < RETRIES) {
        // 网络抖动不该让整次发布失败，但也不能无限重试掩盖真故障
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }
  throw lastError;
}

async function main() {
  for (const asset of ASSETS) {
    const dest = join(ROOT, "public", asset.local);

    // 本地已有就跳过：`pnpm dev` 反复启动时不必每次都拉一遍。
    // CI 每次都是干净工作区，该拉的一次不会少。
    if (existsSync(dest) && statSync(dest).size > 0) {
      console.log(`跳过 ${asset.local}（本地已存在）`);
      continue;
    }

    const url = `${BASE}/${asset.remote}`;
    try {
      const buf = await download(url);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, buf);
      console.log(
        `已拉取 ${asset.local}（${(buf.length / 1024).toFixed(1)} KB）`,
      );
    } catch (e) {
      // 拉不到**不让构建失败**。
      //
      // 一开始写的是 exit 1，理由是「宁可当场红着，也别产出带破图的站点」。
      // 那个权衡建立在「构建环境一定能访问源站」这个前提上，而前提不成立：
      // 源站是 Cloudflare R2，构建跑在 EdgeOne 的节点上，那条链路的可达性
      // 恰恰是本次迁移要解决的问题本身。
      //
      // 真实的代价对比是：构建失败 = **整站都不更新**（包括修故障的那些提交），
      // 降级 = 赞助页少两张图。后者小得多。何况前端已有兜底：图片加载失败时
      // 收款码区块整体收起，显示「渠道准备中」，不会留下破图。
      //
      // 发布流程里想要严格行为（比如确认收款码必须在场），设 ASSET_FETCH_STRICT=1。
      console.error(`::warning::拉取 ${url} 失败：${e?.message ?? e}`);
      console.error(
        "  赞助页将显示「渠道准备中」。构建继续。" +
          "若源站已迁移，设置 ASSET_SOURCE_BASE 指向新地址。",
      );
      if (process.env.ASSET_FETCH_STRICT === "1") process.exit(1);
    }
  }
}

await main();
