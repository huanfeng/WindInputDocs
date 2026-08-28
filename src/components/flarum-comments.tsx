"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CONTENT_MAX,
  discussionIdOf,
  discussionUrl,
  type FlarumComment,
  type FlarumUser,
  fetchComments,
  fetchMe,
  formatTime,
  loginUrl,
  postComment,
} from "@/lib/flarum";

/**
 * 文档页评论区。后端是 forum.windinput.com 的 Flarum，浏览器直连其 API。
 *
 * 与论坛共享登录态：用户在论坛登录过，这里直接就能发言，不需要二次登录，
 * 发出的评论同时出现在论坛对应主题下（见 lib/flarum.ts 顶部关于跨域的说明）。
 *
 * 沿用旧评论区的两条约定：
 *   - 后端不可达时**整块收起**，不给读文档的人看任何报错（同下载量徽章）。
 *   - 卸载时 abort，避免切页后回写已卸载的组件。
 */
export function FlarumComments({ pageId }: { pageId: string }) {
  const discussionId = discussionIdOf(pageId);

  const [comments, setComments] = useState<FlarumComment[] | null>(null);
  const [me, setMe] = useState<FlarumUser | null>(null);
  const [ready, setReady] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (!discussionId) {
      setReady(true);
      return;
    }
    // 两个请求并发：评论列表是主体，登录态只决定底部显示表单还是登录提示，
    // 串行等待会让评论区多空一个来回。
    Promise.all([fetchComments(discussionId), fetchMe()]).then(
      ([list, user]) => {
        if (!alive.current) return;
        setComments(list);
        setMe(user);
        setReady(true);
      },
    );
    return () => {
      alive.current = false;
    };
  }, [discussionId]);

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = content.trim();
      if (!discussionId || !text || submitting) return;

      setSubmitting(true);
      setNotice(null);
      const res = await postComment(discussionId, text);
      if (!alive.current) return;
      setSubmitting(false);

      if (res.ok) {
        setComments((prev) => [...(prev ?? []), res.comment]);
        setContent("");
        setNotice({ kind: "ok", text: "已发表" });
        return;
      }
      setNotice({
        kind: "error",
        text:
          res.reason === "unauthenticated"
            ? "登录状态已失效，请重新登录后再试"
            : res.reason === "rate_limited"
              ? "发得有点快，稍后再试"
              : res.reason === "network"
                ? "网络不通，稍后再试"
                : "发表失败，请检查内容后重试",
      });
      // 401 多半是 session 过期。重新查一次登录态，让界面从表单切回登录提示，
      // 否则用户会对着一个永远提交失败的输入框反复重试。
      if (res.reason === "unauthenticated") {
        fetchMe().then((u) => alive.current && setMe(u));
      }
    },
    [content, discussionId, submitting],
  );

  // 这篇文档还没同步过主题（新增文档但没跑 scripts/sync-doc-discussions.mjs），
  // 或者 Flarum 不可达 —— 两种情况都整块不渲染，页面看起来就是没有评论区。
  if (!discussionId) return null;
  if (ready && comments === null) return null;

  const len = content.trim().length;
  const canSubmit = !submitting && len > 0 && len <= CONTENT_MAX;

  return (
    <section id="comments" className="mt-12 border-fd-border border-t pt-8">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-lg">评论</h2>
        <a
          href={discussionUrl(discussionId)}
          target="_blank"
          rel="noreferrer"
          className="text-fd-muted-foreground text-xs hover:text-fd-primary"
        >
          在社区查看 →
        </a>
      </div>

      {!ready ? (
        <p className="py-6 text-center text-fd-muted-foreground text-sm">
          加载中…
        </p>
      ) : comments && comments.length > 0 ? (
        <ul className="space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              {c.user?.avatarUrl ? (
                // 用原生 img 而非 next/image：头像域名不在 next.config 的 images
                // 白名单里，且 output:"export" 本就不做图片优化，换成 Image 只会
                // 在构建期报未配置域名。
                // biome-ignore lint/performance/noImgElement: 见上
                <img
                  src={c.user.avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-full"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fd-muted text-fd-muted-foreground text-xs">
                  {(c.user?.displayName ?? "?").slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm">
                    {c.user?.displayName ?? "已注销"}
                  </span>
                  <span className="text-fd-muted-foreground text-xs">
                    {formatTime(c.createdAt)}
                  </span>
                </div>
                {/* Flarum 服务端已对正文做净化（它自己的页面也直接注入这段 HTML），
                    这里不再二次处理，否则代码块和链接的格式会被破坏。 */}
                <div
                  className="prose-sm mt-1 break-words text-sm [&_a]:text-fd-primary [&_code]:rounded [&_code]:bg-fd-muted [&_code]:px-1 [&_p]:my-1"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: 见上
                  dangerouslySetInnerHTML={{ __html: c.contentHtml }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-fd-muted-foreground text-sm">
          还没有评论，来说第一句吧
        </p>
      )}

      {me ? (
        <form onSubmit={submit} className="mt-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={CONTENT_MAX}
            placeholder="说点什么…… 发现文档有误或没看懂，也欢迎在这里指出"
            aria-label="评论内容"
            className="w-full resize-y rounded-md border bg-fd-background px-3 py-2 text-sm outline-none focus:border-fd-primary"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-h-5 text-xs">
              {notice && (
                <span
                  className={
                    notice.kind === "error"
                      ? // 唯一没走 fd-* 主题变量的颜色：fumadocs 没有语义化的错误色。
                        // 暗色下 red-500 对比度偏低，换 red-400。
                        "text-red-500 dark:text-red-400"
                      : "text-fd-primary"
                  }
                >
                  {notice.text}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-fd-muted-foreground text-xs">
                以 {me.displayName} 的身份
              </span>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-md bg-fd-primary px-4 py-1.5 font-medium text-fd-primary-foreground text-sm disabled:opacity-50"
              >
                {submitting ? "发送中…" : "发表"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mt-6 rounded-md border bg-fd-card px-4 py-3 text-sm">
          <span className="text-fd-muted-foreground">
            发表评论需要先登录社区。
          </span>{" "}
          <a
            href={loginUrl(
              typeof window === "undefined" ? "" : window.location.href,
            )}
            className="font-medium text-fd-primary hover:underline"
          >
            登录或注册 →
          </a>
        </div>
      )}
    </section>
  );
}
