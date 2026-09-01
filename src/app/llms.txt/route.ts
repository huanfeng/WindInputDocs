import { llms } from "fumadocs-core/source";
import { getVisiblePageTree, source } from "@/lib/source";

export const revalidate = false;

export function GET() {
  // llms() 只认页面树，喂它剪枝过的那份——整页未发布的条目不该出现在给模型的索引里，
  // 那等于绕开页面上的隐藏、换条路把还没发布的功能告诉用户（见 lib/source.ts）。
  return new Response(
    llms({
      ...source,
      getPageTree: (locale) => getVisiblePageTree(locale),
    }).index(),
  );
}
