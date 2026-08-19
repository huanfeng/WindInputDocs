"use client";

import Link from "fumadocs-core/link";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/comments";
import { cn } from "@/lib/cn";
import {
  COMMENTS_ANCHOR,
  formatTime,
  type OverviewData,
  overviewApi,
} from "@/lib/comments";

/**
 * 全站留言总览。数据来自 worker-comments 的 /api/comments/overview。
 *
 * 纯客户端拉取，与 comments.tsx / download-stats.tsx 同一套路：站点是静态导出
 * （next.config.mjs 的 output: "export"），没有服务端，留言也不该在构建期定值。
 *
 * **降级策略在此处有意偏离既有约定**：文档页的评论区与下载徽章请求失败时整块静默
 * 收起，因为它们只是页面的附属物，收起了页面照样完整。这个页面不同 —— 它整个就是
 * 为留言存在的，静默收起只会留下一片空白，比报错更让人困惑。所以这里明确显示失败。
 *
 * @param titles 构建期烘焙的 { page.url -> 文档标题 } 映射。Worker 只存 page_id
 *   （即 URL），标题由前端解析：这样改文档标题时总览页自动跟上，Worker 侧不需要
 *   冗余存一份会过期的标题。映射里查不到的 page_id 就是孤儿留言（文档被删或改了
 *   路径），单独标出来——这是发现孤儿的唯一途径。
 */
export function CommentsOverview({
  titles,
}: {
  titles: Record<string, string>;
}) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"recent" | "pages">("recent");

  useEffect(() => {
    const ac = new AbortController();
    fetch(overviewApi, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((d: OverviewData) => {
        if (Array.isArray(d?.items) && Array.isArray(d?.pages)) setData(d);
        else setFailed(true);
      })
      .catch(() => {
        // 切页触发的 abort 也会走到这里，此时组件已卸载，setState 被忽略。
        if (!ac.signal.aborted) setFailed(true);
      });
    return () => ac.abort();
  }, []);

  if (failed) {
    return (
      <p className="mt-10 rounded-lg border border-dashed py-12 text-center text-fd-muted-foreground text-sm">
        留言暂时无法加载，请稍后重试。
      </p>
    );
  }

  // 骨架屏而非 spinner：高度与真实内容接近，数据到达时不会把页面顶一下。
  if (!data) {
    return (
      <div className="mt-10 space-y-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-fd-muted/50"
          />
        ))}
      </div>
    );
  }

  // 运行时开关关停。这里与文档页的处理刻意不同：文档页整块消失即可（评论区本就是
  // 附属物），而这个页面是从顶栏点进来的，什么都不说会让人以为页面坏了。
  // 只说「已关闭」，不解释原因——理由同文档页，不给刷站的人反馈信号。
  if (data.closed) {
    return (
      <p className="mt-10 rounded-lg border border-dashed py-12 text-center text-fd-muted-foreground text-sm">
        留言功能已关闭。
      </p>
    );
  }

  if (data.total === 0) {
    return (
      <p className="mt-10 rounded-lg border border-dashed py-12 text-center text-fd-muted-foreground text-sm">
        还没有任何留言。去文档里说第一句吧。
      </p>
    );
  }

  return (
    <>
      <div className="mt-8 flex items-center gap-1 border-b">
        <Tab active={tab === "recent"} onClick={() => setTab("recent")}>
          最新
        </Tab>
        <Tab active={tab === "pages"} onClick={() => setTab("pages")}>
          按文档
          <span className="ml-1.5 text-fd-muted-foreground text-xs">
            {data.pages.length}
          </span>
        </Tab>
      </div>

      {tab === "recent" ? (
        <ul className="mt-6 space-y-6">
          {data.items.map((item) => (
            <li key={item.id}>
              <div className="flex items-center gap-2">
                <Avatar nick={item.nick} />
                <span className="font-medium text-fd-foreground text-sm">
                  {item.nick}
                </span>
                <span className="text-fd-muted-foreground text-xs">
                  {formatTime(item.createdAt)}
                </span>
              </div>
              {/* 正文是纯文本，交给 React 转义即可 —— 全站不存在把留言当 HTML 渲染的路径。
                  折到 4 行，想看全文点下面的来源链接过去。 */}
              <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap break-words pl-8 text-fd-foreground/90 text-sm">
                {item.content}
              </p>
              <div className="mt-1.5 pl-8">
                <PageLink page={item.page} titles={titles} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-6 divide-y">
          {data.pages.map((p) => (
            <li key={p.page}>
              <Link
                href={`${p.page}#${COMMENTS_ANCHOR}`}
                className="flex items-baseline gap-3 py-3 transition-colors hover:text-fd-primary"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {titles[p.page] ?? <OrphanLabel page={p.page} />}
                </span>
                <span className="shrink-0 text-fd-muted-foreground text-xs">
                  {p.count} 条 · {formatTime(p.lastAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
        active
          ? "border-fd-primary text-fd-primary"
          : "border-transparent text-fd-muted-foreground hover:text-fd-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** 「最新」视图里每条留言底部的来源文档链接。 */
function PageLink({
  page,
  titles,
}: {
  page: string;
  titles: Record<string, string>;
}) {
  const title = titles[page];
  if (!title) return <OrphanLabel page={page} />;

  return (
    <Link
      href={`${page}#${COMMENTS_ANCHOR}`}
      className="inline-flex items-center gap-1 text-fd-muted-foreground text-xs hover:text-fd-primary"
    >
      <MessageSquare className="size-3" aria-hidden />
      {title}
    </Link>
  );
}

/**
 * 孤儿留言：page_id 在标题映射里找不到，说明那篇文档已被删除或改了路径。
 * 不做成链接（点过去是 404），但要显示出来 —— docs/[[...slug]]/page.tsx 早就
 * 警告过「改文档路径要一并迁移 comments.page_id」，这里是唯一能发现漏迁的地方。
 */
function OrphanLabel({ page }: { page: string }) {
  return (
    <span
      className="text-fd-muted-foreground text-xs"
      title="该文档已移除或路径已变更"
    >
      ⚠️ {page}
    </span>
  );
}
