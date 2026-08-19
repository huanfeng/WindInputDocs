// 构建期给「尚未发布」的内容打标记，由 CSS 默认藏起来（见 app/global.css）。
//
// 文档常常先于发布写好，读者装的是已发布版，看到装不上的功能只会以为是自己配错了。
// 判据取自 `<Since v="…" />` 与 releases.json 的对比——版本一发布，隐藏自动解除，
// 不需要回头去摘任何标记。
//
// 为什么在构建期打标记、而不是在浏览器里用 JS 藏：JS 只能在内容渲染之后动手，
// 未发布的内容会先闪一下再消失——那等于没藏。这里产出的是静态属性，CSS 从首帧起就生效。
//
// 覆盖四种粒度中的三种：小节（标题连同其下正文）、表格行、列表项。**段落行内**的标注
// 盖不住——那是句子里的并列成分，抽掉会留下病句，只能改写句子。scripts/check-mdx.mjs
// 会把未发布版本的行内标注拦在 lint 阶段，不让它静默泄露。
import { isUnreleased } from "./releases";

interface Node {
  type: string;
  name?: string | null;
  depth?: number;
  attributes?: Array<{ type: string; name?: string; value?: unknown }>;
  children?: Node[];
  data?: { hProperties?: Record<string, unknown> };
}

/** 标记后由 `:root:not([data-preview]) [data-unreleased]` 隐藏。 */
const MARKER = "data-unreleased";

/** 取 `<Since v="0.118" />` 的 v，非 Since 节点返回 null。 */
function sinceVersion(node: Node): string | null {
  if (node.type !== "mdxJsxTextElement" && node.type !== "mdxJsxFlowElement") {
    return null;
  }
  if (node.name !== "Since") return null;
  for (const attr of node.attributes ?? []) {
    if (attr.name === "v" && typeof attr.value === "string") return attr.value;
  }
  return null;
}

/** 子树里是否有指向未发布版本的 `<Since>`。
 *
 * 自己递归而不用 unist-util-visit：那个包只是 fumadocs 的传递依赖，pnpm 的严格
 * node_modules 布局下直接 import 会解析失败，为几行遍历添一个直接依赖不划算。 */
function hasUnreleasedSince(node: Node): boolean {
  if (isUnreleased(sinceVersion(node) ?? "")) return true;
  for (const child of node.children ?? []) {
    if (hasUnreleasedSince(child)) return true;
  }
  return false;
}

function mark(node: Node): void {
  node.data ??= {};
  node.data.hProperties ??= {};
  node.data.hProperties[MARKER] = "";
}

/** 递归标记表格行与列表项——它们各自是完整的一条，抽掉不伤上下文。 */
function markRowsAndItems(node: Node): void {
  for (const child of node.children ?? []) {
    if (
      (child.type === "tableRow" || child.type === "listItem") &&
      hasUnreleasedSince(child)
    ) {
      mark(child);
      continue; // 整条已隐藏，不必再往里找
    }
    markRowsAndItems(child);
  }
}

/** 把一段连续的顶层节点裹进 `<div data-unreleased>`。
 *
 * 逐个节点打 hProperties 是不够的：`<Callout>` 这类 JSX 元素编译成组件调用，
 * hProperties 会被整个丢掉，未发布小节里的提示框就照常显示了。裹一层 div 则与节点
 * 类型无关，内部有什么都一并藏住。 */
function wrap(children: Node[]): Node {
  return {
    type: "mdxJsxFlowElement",
    name: "div",
    attributes: [{ type: "mdxJsxAttribute", name: MARKER, value: "" }],
    children,
  };
}

export function remarkUnreleased() {
  return (tree: Node) => {
    markRowsAndItems(tree);

    // 小节：从带未发布标注的标题起，到下一个同级或更高级标题为止，整段裹进容器。
    // MDX 里「一节」不是一个容器，标题与正文是平铺的兄弟节点，只能这样圈定范围。
    const children = tree.children ?? [];
    const rebuilt: Node[] = [];
    let hiding: Node[] | null = null;
    let hidingDepth = 0;

    const flush = () => {
      if (hiding?.length) rebuilt.push(wrap(hiding));
      hiding = null;
      hidingDepth = 0;
    };

    for (const node of children) {
      if (node.type === "heading") {
        // 先结束上一节再判断新的一节：同级标题两件事都要做
        if (hidingDepth && (node.depth ?? 0) <= hidingDepth) flush();
        if (!hidingDepth && hasUnreleasedSince(node)) {
          hidingDepth = node.depth ?? 0;
          hiding = [];
        }
      }
      if (hiding) hiding.push(node);
      else rebuilt.push(node);
    }
    flush();

    tree.children = rebuilt;
  };
}
