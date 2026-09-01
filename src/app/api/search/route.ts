import { createTokenizer } from "@orama/tokenizers/mandarin";
import type { StructuredData } from "fumadocs-core/mdx-plugins";
import { createFromSource } from "fumadocs-core/search/server";
import {
  getUnreleasedAnchors,
  hasUnreleasedTexts,
  isUnreleasedText,
} from "@/lib/since-index";
import { isUnreleasedPage, source } from "@/lib/source";

export const revalidate = false;

// 中文内容必须使用 mandarin tokenizer，默认英文分词对 CJK 无效。
// 客户端（components/search.tsx 的 initOrama）需保持同款 tokenizer。
export const { staticGET: GET } = createFromSource(source, {
  tokenizer: createTokenizer(),
  search: {
    threshold: 0,
    tolerance: 0,
  },
  // 未发布小节的标题必须从索引里摘掉。正文由 CSS 藏住，但搜索是另一条入口：
  // 搜得到、点进去却什么都没有，比一开始就看到那段文字更让人摸不着头脑。
  async buildIndex(page) {
    // 整页未发布：连标题和描述都要留空。这个回调必须给每一页返回一条记录，
    // 没有跳过的余地——所以把可搜的文字全部抽干，让它在索引里没有任何命中面。
    if (isUnreleasedPage(page.url)) {
      return {
        title: "",
        url: page.url,
        id: page.url,
        structuredData: { headings: [], contents: [] },
      };
    }

    // 这个字段声明成「数据或返回数据的函数」，两种形态都要接住
    const raw = page.data.structuredData as
      | StructuredData
      | (() => StructuredData | Promise<StructuredData>);
    const data = typeof raw === "function" ? await raw() : raw;

    const anchors = getUnreleasedAnchors(page.url);
    const hasTexts = hasUnreleasedTexts(page.url);
    const structuredData =
      anchors.size > 0 || hasTexts
        ? {
            headings: data.headings.filter((h) => !anchors.has(h.id)),
            contents: data.contents.filter(
              (c) =>
                // 未发布小节名下的内容（整节裹进容器后一般已经进不来，这里兜底）
                (!c.heading || !anchors.has(c.heading)) &&
                // 未发布的表格单元格与列表项——它们藏得住显示，藏不住索引
                !isUnreleasedText(page.url, c.content),
            ),
          }
        : data;

    return {
      title: page.data.title ?? page.url,
      description: page.data.description,
      url: page.url,
      id: page.url,
      structuredData,
    };
  },
});
