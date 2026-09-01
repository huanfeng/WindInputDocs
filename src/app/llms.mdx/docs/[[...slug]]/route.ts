import { notFound } from "next/navigation";
import {
  getLLMText,
  getPageMarkdownUrl,
  isUnreleasedPage,
  source,
} from "@/lib/source";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<"/llms.mdx/docs/[[...slug]]">,
) {
  const { slug } = await params;
  // remove the appended "content.md"
  const page = source.getPage(slug?.slice(0, -1));
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}

export function generateStaticParams() {
  // 整页未发布的页不导出这份纯文本：页面上藏住了，这里给出去就白藏了。
  // 代价是预览模式下那一页的「复制 Markdown」按钮指向一个不存在的文件——
  // 预览是拿链接直接看内容用的，不必为它把未发布内容摊在静态产物里。
  return source
    .getPages()
    .filter((page) => !isUnreleasedPage(page.url))
    .map((page) => ({
      slug: getPageMarkdownUrl(page).segments,
    }));
}
