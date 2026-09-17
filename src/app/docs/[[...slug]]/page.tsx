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
import { DocsFeedback } from "@/components/docs-feedback";
import { DocsVersion } from "@/components/docs-version";
import { getMDXComponents } from "@/components/mdx";
import { gitConfig } from "@/lib/shared";
import { getUnreleasedAnchors } from "@/lib/since-index";
import {
  getPageImage,
  getPageMarkdownUrl,
  isUnreleasedPage,
  source,
} from "@/lib/source";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  // 整页都还没发布：标题与描述来自 frontmatter，由这里渲染，remark 那侧的隐藏够不着，
  // 得连同正文一起裹起来。侧栏、站点地图、搜索、llms.txt 各自在别处摘（见 lib/source.ts）。
  const wholePageUnreleased = isUnreleasedPage(page.url);

  // 目录不是正文的一部分，是另外生成的一份数据，藏正文的那条 CSS 管不到它——
  // 未发布的小节会照常列在右侧目录里，点进去还是个空位置。这里按锚点摘掉。
  // 代价是预览模式下目录也少这一项（目录在服务端就定了），正文仍完整可见。
  const unreleased = getUnreleasedAnchors(page.url);
  const toc = wholePageUnreleased
    ? []
    : unreleased.size > 0
      ? page.data.toc.filter((item) => !unreleased.has(item.url.slice(1)))
      : page.data.toc;

  const body = (
    <>
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
      {/* 每页评论已下架，改为引到「文档反馈」版块，理由见组件注释 */}
      <DocsFeedback />
    </>
  );

  return (
    <DocsPage toc={toc} full={page.data.full}>
      {/* 只在整页未发布时多包一层：常态下的 DOM 与之前一字不差 */}
      {wholePageUnreleased ? <div data-unreleased>{body}</div> : body}
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
    // 未发布的页仍会被静态导出（预览模式要拿链接直接看），但站点地图里没有它，
    // 也不该被搜索引擎从别处的链接顺藤摸进来收录。
    ...(isUnreleasedPage(page.url) ? { robots: { index: false } } : {}),
  };
}
