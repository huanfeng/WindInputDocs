import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/shared";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // OG 图与 llms 文本路由是给机器读的派生产物，不需要进索引
      disallow: ["/og/", "/llms.mdx/", "/api/"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
