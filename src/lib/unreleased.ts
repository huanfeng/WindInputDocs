// 从 Markdown 文本里剔掉尚未发布的内容。
//
// 页面上的隐藏由 remark-unreleased.ts + CSS 完成，但导给模型看的那几份纯文本
// （/llms-full.txt、各页的 content.md）不经过样式——AI 助手照着回答，用户就从
// 另一条路知道了还没发布的功能，比自己翻页面看到更难察觉。
//
// 单独成一个模块是为了不成环：since-index.ts 依赖 source，而 source 要用这里的
// 过滤，放进去就会互相 import。这里只依赖版本判定，谁都能安全引用。
import { isUnreleased } from "./releases";

const SINCE_RE = /<Since\s+v="([\d.]+)"\s*\/>/;
/** 整页标注：`<Since>` 独占一行，行内不带别的东西。 */
const PAGE_SINCE_RE = /^<Since\s+v="([\d.]+)"\s*\/>$/;
const HEADING_RE = /^(#{1,6})\s+/;
const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})/;
const TABLE_ROW_RE = /^\|/;
const LIST_ITEM_RE = /^[-*+]\s/;

/** 这一行是不是指向未发布版本的标注。 */
function marksUnreleased(line: string): boolean {
  const m = SINCE_RE.exec(line);
  return m ? isUnreleased(m[1]) : false;
}

/** 页首「整页都是新功能」那行标注的版本，没有则 null。
 *
 * 按 AGENTS.md 的约定，整页新增时 `<Since>` 独立成行写在正文开头，小节新增则挂在
 * 标题末尾。位置之差不只是排版：整页未发布要藏的不止正文，还有侧栏条目、右侧目录、
 * 搜索索引与导给模型的纯文本——正文藏了而入口还在，读者点进去只会看到一片空白。
 * 那几处各自在别的模块里，都以这个函数为判据（见 lib/source.ts 的 unreleasedPages）。
 *
 * 扫描止于第一个标题：再往下是小节的地盘，那里的标注只管它自己那一节。
 * 传进来的文本带不带 frontmatter 都行——两种调用方都有（源码 / 编译后的 processed）。 */
export function pageSinceVersion(markdown: string): string | null {
  const lines = markdown.split("\n");
  let inFrontmatter = lines[0]?.trim() === "---";

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (inFrontmatter) {
      if (i > 0 && trimmed === "---") inFrontmatter = false;
      continue;
    }

    if (HEADING_RE.test(trimmed)) return null;
    const m = PAGE_SINCE_RE.exec(trimmed);
    if (m) return m[1];
  }

  return null;
}

/** 这一页是不是整页都还没发布。按 url 查请用 lib/source.ts 的 isUnreleasedPage。 */
export function isUnreleasedPageText(markdown: string): boolean {
  const version = pageSinceVersion(markdown);
  return version ? isUnreleased(version) : false;
}

/**
 * 删掉未发布的小节、表格行与列表项，其余原样保留。
 *
 * 与页面上的隐藏口径一致（见 lib/remark-unreleased.ts）：能整块拿掉的才拿，
 * 段落中间的标注拿不掉——那种写法由 scripts/check-mdx.mjs 在 lint 阶段拦下，
 * 不会走到这里。
 */
export function stripUnreleased(markdown: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  let hidingDepth = 0;

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();

    // 代码块里的内容一律照抄：里面的 `<Since>` 是示例，不是标注
    if (fence) {
      out.push(line);
      if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    const openFence = FENCE_RE.exec(line);
    if (openFence) {
      fence = openFence[2];
      if (!hidingDepth) out.push(line);
      continue;
    }

    const heading = HEADING_RE.exec(trimmed);
    if (heading) {
      // 先结束上一节再判断新的一节：同级标题两件事都要做
      if (hidingDepth && heading[1].length <= hidingDepth) hidingDepth = 0;
      if (!hidingDepth && marksUnreleased(trimmed)) {
        hidingDepth = heading[1].length;
      }
    }

    if (hidingDepth) continue;

    // 表格行与列表项各自是完整的一条，抽掉不伤上下文
    if (
      (TABLE_ROW_RE.test(trimmed) || LIST_ITEM_RE.test(trimmed)) &&
      marksUnreleased(trimmed)
    ) {
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}
