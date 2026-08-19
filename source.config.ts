import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { remarkUnreleased } from "./src/lib/remark-unreleased";

// You can customize Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    // 未发布内容的标记必须在这里打——插件产出的是静态属性，CSS 从首帧起就能藏住它。
    // 放到浏览器端做只能在渲染之后动手，内容会先闪一下。
    remarkPlugins: (v) => [...v, remarkUnreleased],
  },
});
