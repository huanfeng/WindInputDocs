// **仅限服务端**：用了 node:fs 扫描 MDX 源码（见下方 unreleasedPages），
// 只能被 server component、route handler 与构建期代码引用。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { docs } from "collections/server";
import type { Folder, Node, Root } from "fumadocs-core/page-tree";
import { loader } from "fumadocs-core/source";
import { docsContentRoute, docsImageRoute, docsRoute } from "./shared";
import { isUnreleasedPageText, stripUnreleased } from "./unreleased";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [],
});

/** 整页都还没发布的页面 url（页首独立成行的 `<Since>` 指向未发布版本）。
 *
 * 小节级的隐藏只需管正文，remark-unreleased.ts 一处就够；整页级不同——页面有一圈
 * 正文之外的入口：侧栏、站点地图、搜索、llms.txt。它们各自从别的数据生成，藏正文
 * 那条 CSS 一个都管不到。留着任何一个，读者都会被领到一页空白前面。
 *
 * 判据与小节级同源（releases.json），版本一发布，这个集合自然变空，隐藏全部解除，
 * 不需要回头去摘任何标记。
 *
 * 构建期一次性扫完：静态导出下模块只求值一次，之后每处调用都是 Set 查表。 */
const unreleasedPages: ReadonlySet<string> = (() => {
  const set = new Set<string>();

  for (const page of source.getPages()) {
    const absolutePath =
      page.absolutePath ?? join(process.cwd(), "content/docs", page.path);
    try {
      if (isUnreleasedPageText(readFileSync(absolutePath, "utf8"))) {
        set.add(page.url);
      }
    } catch {
      // 读不到的页不该拖垮整个构建
    }
  }

  return set;
})();

/** 这个 url 对应的页面是不是整页都还没发布。 */
export function isUnreleasedPage(url: string): boolean {
  return unreleasedPages.has(url);
}

function pruneChildren(children: Node[]): Node[] {
  const out: Node[] = [];

  for (const child of children) {
    if (child.type === "page") {
      if (!isUnreleasedPage(child.url)) out.push(child);
      continue;
    }

    if (child.type === "folder") {
      const folder: Folder = {
        ...child,
        index:
          child.index && isUnreleasedPage(child.index.url)
            ? undefined
            : child.index,
        children: pruneChildren(child.children),
      };
      // 整个分区都还没发布时留一个空壳文件夹，比留着条目更费解
      if (folder.children.length > 0 || folder.index) out.push(folder);
      continue;
    }

    out.push(child); // separator
  }

  return out;
}

/** 页面树，摘掉整页未发布的条目。侧栏与 llms.txt 都走这一份。
 *
 * 与右侧目录一样，树在服务端就定了——预览模式（`?preview=1`）下侧栏同样少这一项，
 * 正文仍完整可见。预览是拿链接直接看内容用的，不指望从导航走进去。 */
export function getVisiblePageTree(locale?: string): Root {
  const tree = source.getPageTree(locale);
  return { ...tree, children: pruneChildren(tree.children) };
}

export function getPageImage(page: (typeof source)["$inferPage"]) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join("/")}`,
  };
}

export function getPageMarkdownUrl(page: (typeof source)["$inferPage"]) {
  const segments = [...page.slugs, "content.md"];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join("/")}`,
  };
}

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");

  // 这份文本是给模型读的，不经过样式——页面上藏起来的未发布内容在这里是明文，
  // AI 助手照着回答，用户就从另一条路知道了还没发布的功能。
  return `# ${page.data.title} (${page.url})

${stripUnreleased(processed)}`;
}
