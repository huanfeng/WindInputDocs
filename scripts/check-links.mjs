#!/usr/bin/env node
/**
 * 检查构建产物里的站内链接是否真能到达。
 *
 * 站内深链坏掉时不会报任何错——点了就跳到页面顶部，看起来只是"没滚动"。文档站里
 * 这类链接大多指向中文标题自动生成的 id（`#配置的分工全局行为--方案固定参数`），
 * 标题文案一改，id 跟着变，链接就静默失效；另一半是目录结构调整后没跟着改的旧路径。
 * 首次接入时一口气查出 25 条，其中 18 条在首页技巧轮播上。
 *
 * 与 check-mdx.mjs 分开、不并进 `pnpm lint` 的原因：锚点的真实值只有构建完才知道
 * （id 由 remark/rehype 生成，源码里看不出来），所以这一步必须跑在 `pnpm build`
 * 之后，而 lint 要保持不依赖构建、随时能跑。
 *
 * 用法：
 *     pnpm build && pnpm lint:links
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = "out";
/** 回查出处的范围：文档正文，以及首页/下载页这些手写链接的组件。 */
const SOURCE_ROOTS = [
  { dir: "content", ext: ".mdx" },
  { dir: "src", ext: ".tsx" },
  { dir: "src", ext: ".ts" },
];

if (!existsSync(OUT)) {
  console.error(`找不到构建产物目录 ${OUT}/，请先运行 pnpm build。`);
  process.exit(1);
}

function* walk(dir, ext) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full, ext);
    else if (entry.isFile() && entry.name.endsWith(ext)) yield full;
  }
}

/** 站内路径 → 产物文件。返回 { file, isPage }，找不到则返回 null。 */
function resolve(urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\//, "");
  const asPage = join(OUT, `${rel}.html`);
  if (existsSync(asPage)) return { file: asPage, isPage: true };

  const asIndex = join(OUT, rel, "index.html");
  if (existsSync(asIndex)) return { file: asIndex, isPage: true };

  // /llms.txt、/robots.txt 这类非 HTML 产物：存在即可，没有锚点可言
  const asFile = join(OUT, rel);
  if (rel && existsSync(asFile) && statSync(asFile).isFile()) {
    return { file: asFile, isPage: false };
  }

  if (rel === "") return { file: join(OUT, "index.html"), isPage: true };
  return null;
}

/** 页面里出现过的所有 id。 */
const idCache = new Map();
function idsOf(file) {
  let ids = idCache.get(file);
  if (!ids) {
    ids = new Set(
      [...readFileSync(file, "utf8").matchAll(/id="([^"]*)"/g)].map(
        (m) => m[1],
      ),
    );
    idCache.set(file, ids);
  }
  return ids;
}

function hasAnchor(file, anchor) {
  const ids = idsOf(file);
  // href 里的中文锚点是百分号编码的，id 属性里是原文，两种写法都认
  return ids.has(anchor) || ids.has(decodeURIComponent(anchor));
}

/** 坏链回到 MDX 源码找出处——报一个产物路径没法直接改。 */
let sources = null;
function findSources(link) {
  sources ??= SOURCE_ROOTS.flatMap(({ dir, ext }) =>
    [...walk(dir, ext)].map((file) => ({
      file: relative(process.cwd(), file).split(sep).join("/"),
      lines: readFileSync(file, "utf8").split("\n"),
    })),
  );

  const hits = [];
  for (const { file, lines } of sources) {
    lines.forEach((line, i) => {
      if (line.includes(link)) hits.push(`${file}:${i + 1}`);
    });
  }
  return hits;
}

const problems = [];
let checked = 0;

for (const file of walk(OUT, ".html")) {
  const html = readFileSync(file, "utf8");
  const from = relative(OUT, file).split(sep).join("/");

  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    // 站外链接、协议链接一律不管；单独的 # 是占位符
    if (!href.startsWith("/") && !href.startsWith("#")) continue;
    if (href === "#") continue;

    const [rawPath, anchor] = href.split("#");
    // 查询串是资源版本号（favicon 带 ?icon.xxx.png），不参与路径解析
    const urlPath = rawPath.split("?")[0];
    checked++;

    // 同页锚点：手写的那些同样会随标题改名失效
    if (urlPath === "") {
      if (!hasAnchor(file, anchor)) {
        problems.push({ from, href, reason: "同页锚点不存在" });
      }
      continue;
    }

    const target = resolve(urlPath);
    if (!target) {
      problems.push({ from, href, reason: "页面不存在" });
      continue;
    }
    if (anchor && target.isPage && !hasAnchor(target.file, anchor)) {
      problems.push({ from, href, reason: "锚点不存在" });
    }
  }
}

// 产物里只有"渲染出来的"链接。首页技巧轮播这类组件一次只渲染一条，其余十几条的
// 链接压根不出现在 HTML 里——纯靠扫产物，它们坏成什么样都查不出来。所以再扫一遍
// 源码中的文档深链。只认 /docs 开头的：其余路径里混着 /api/stats 这类不落产物的
// 接口地址，一并检查会全是误报。
// 必须紧跟在引号 / 反引号 / `(` 之后，且路径段只含 URL 安全字符。这两条把三类
// 常见误伤挡在外面：注释里提到的文件路径（`app/docs/layout.tsx`）、外部文档地址
// （`https://fumadocs.dev/docs/...`，`/docs` 前面不是引号）、Next 的动态路由占位
// 符（`/docs/[[...slug]]`，方括号不在字符集里）。锚点部分放宽，中文锚点要能过。
const DOC_LINK_RE = /["'`(]\s*(\/docs\/[A-Za-z0-9\-_/]*(?:#[^"'`)\s>]*)?)/g;

for (const { dir, ext } of SOURCE_ROOTS) {
  for (const file of walk(dir, ext)) {
    const name = relative(process.cwd(), file).split(sep).join("/");
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line) => {
        for (const [, link] of line.matchAll(DOC_LINK_RE)) {
          const [rawPath, anchor] = link.split("#");
          const urlPath = rawPath.split("?")[0].replace(/[.,;:]+$/, "");

          // 以 / 收尾说明后面还有字符没被字符集接住，这不是一条完整链接，而是被
          // 截断的片段——路由类型里的 `"/docs/[[...slug]]"` 就会截成 `/docs/`。
          if (urlPath.endsWith("/")) continue;
          checked++;

          const target = resolve(urlPath);
          if (!target) {
            problems.push({ from: name, href: link, reason: "页面不存在" });
            continue;
          }
          if (anchor && target.isPage && !hasAnchor(target.file, anchor)) {
            problems.push({ from: name, href: link, reason: "锚点不存在" });
          }
        }
      });
  }
}

if (problems.length === 0) {
  console.log(`站内链接检查通过：${checked} 条链接全部可达。`);
  process.exit(0);
}

// 同一条坏链常被多个页面引用（导航、目录），按链接归拢，避免刷屏
const grouped = new Map();
for (const p of problems) {
  const key = `${p.href}\t${p.reason}`;
  const list = grouped.get(key) ?? [];
  list.push(p.from);
  grouped.set(key, list);
}

for (const [key, pages] of grouped) {
  const [href, reason] = key.split("\t");
  console.error(`✗ ${href}  ${reason}`);
  const where = findSources(href);
  if (where.length > 0) {
    for (const w of where) console.error(`    出处 ${w}`);
  } else {
    console.error(
      `    出现在 ${pages.slice(0, 3).join("、")}${pages.length > 3 ? ` 等 ${pages.length} 处` : ""}（非 MDX 直接书写）`,
    );
  }
}

console.error(
  `\n共 ${grouped.size} 条坏链（${checked} 条中）。站内深链坏掉不会报错，只会跳到页面顶部，\n` +
    `所以必须在这里拦住。多数是中文标题的自动 id 随文案漂移——修的时候顺手给目标标题\n` +
    `补个显式锚点（\`## 标题 [#stable-anchor]\`），比改完再坏一次省事。`,
);
process.exit(1);
