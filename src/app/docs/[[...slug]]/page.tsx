import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/notebook/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Comments } from "@/components/comments";
import { DocsVersion } from "@/components/docs-version";
import { getMDXComponents } from "@/components/mdx";
import { commentsEnabled } from "@/lib/comments";
import { gitConfig } from "@/lib/shared";
import { getUnreleasedAnchors } from "@/lib/since-index";
import { getPageImage, getPageMarkdownUrl, source } from "@/lib/source";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  // 目录不是正文的一部分，是另外生成的一份数据，藏正文的那条 CSS 管不到它——
  // 未发布的小节会照常列在右侧目录里，点进去还是个空位置。这里按锚点摘掉。
  // 代价是预览模式下目录也少这一项（目录在服务端就定了），正文仍完整可见。
  const unreleased = getUnreleasedAnchors(page.url);
  const toc =
    unreleased.size > 0
      ? page.data.toc.filter((item) => !unreleased.has(item.url.slice(1)))
      : page.data.toc;

  return (
    <DocsPage toc={toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">
        {page.data.description}
      </DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
        />
        <DocsVersion />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
      {/* 评论区。pageId 用 page.url（如 /docs/start/concepts）作页面标识——
          改文档路径时记得一并迁移 comments.page_id，否则旧评论会成为孤儿。
          commentsEnabled 是构建期总开关，关掉后整个功能不进产物（见 lib/comments.ts）。 */}
      {commentsEnabled && <Comments pageId={page.url} />}
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
