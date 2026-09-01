import type { MetadataRoute } from "next";
import { commentsEnabled } from "@/lib/comments";
import { siteUrl } from "@/lib/shared";
import { isUnreleasedPage, source } from "@/lib/source";

// output: "export" 下会在构建期生成静态 /sitemap.xml。
// 不写 lastModified：内容页没有可靠的时间源，省略可避免每次构建产生无意义的 diff。
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // 首项优先级最高；/docs 由 source.getPages() 覆盖（文档区首页），此处不重复列出
  const priorities: Record<string, number> = {
    "/": 1,
    "/docs": 0.9,
    "/download": 0.8,
    "/whats-new": 0.6,
    "/changelog": 0.5,
    "/comments": 0.5,
    "/sponsor": 0.4,
  };

  const paths = [
    "/",
    "/download",
    "/whats-new",
    "/changelog",
    // 构建期总开关关掉时这条路由是 404，收录进来会给搜索引擎送死链。
    ...(commentsEnabled ? ["/comments"] : []),
    "/sponsor",
    // 整页未发布的文档不收录：站点地图是主动递给搜索引擎的，
    // 页面上藏住了却在这里列出来，等于从另一头把它送进索引。
    ...source
      .getPages()
      .map((page) => page.url)
      .filter((url) => !isUnreleasedPage(url)),
  ];

  return paths.map((path) => ({
    url: new URL(path, siteUrl).href,
    changeFrequency: "weekly" as const,
    priority: priorities[path] ?? 0.7,
  }));
}
