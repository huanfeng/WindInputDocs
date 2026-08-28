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
import { DocsVersion } from "@/components/docs-version";
import { FlarumComments } from "@/components/flarum-comments";
import { getMDXComponents } from "@/components/mdx";
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
      {/* 评论区。后端是 forum.windinput.com 的 Flarum，与论坛共享登录态。
          pageId 用 page.url（如 /docs/start/concepts）作页面标识，经
          data/doc-discussions.json 映射到具体主题——新增文档后要跑一次
          scripts/sync-doc-discussions.mjs 建主题，否则该页不显示评论区。
          改文档路径等于换了 pageId，映射会失配、旧评论成为孤儿，
          此时应手工把映射表里的旧键改名而不是重新同步。 */}
      <FlarumComments pageId={page.url} />
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
