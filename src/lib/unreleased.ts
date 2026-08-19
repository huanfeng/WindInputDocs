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
const HEADING_RE = /^(#{1,6})\s+/;
const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})/;
const TABLE_ROW_RE = /^\|/;
const LIST_ITEM_RE = /^[-*+]\s/;

/** 这一行是不是指向未发布版本的标注。 */
function marksUnreleased(line: string): boolean {
  const m = SINCE_RE.exec(line);
  return m ? isUnreleased(m[1]) : false;
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
