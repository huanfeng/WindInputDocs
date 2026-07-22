import { createTokenizer } from "@orama/tokenizers/mandarin";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const revalidate = false;

// 中文内容必须使用 mandarin tokenizer，默认英文分词对 CJK 无效。
// 客户端（components/search.tsx 的 initOrama）需保持同款 tokenizer。
export const { staticGET: GET } = createFromSource(source, {
  tokenizer: createTokenizer(),
  search: {
    threshold: 0,
    tolerance: 0,
  },
});
