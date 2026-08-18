"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  COMMENTS_ANCHOR,
  CONTENT_MAX,
  type CommentItem,
  commentsApi,
  formatTime,
  NICK_MAX,
  NICK_STORAGE_KEY,
  type SubmitResult,
} from "@/lib/comments";

interface Notice {
  kind: "ok" | "info" | "error";
  text: string;
}

/**
 * 文档页评论区。数据来自 worker-comments 提供的 /api/comments。
 *
 * 纯客户端拉取：站点是静态导出（next.config.mjs 的 output: "export"），没有服务端，
 * 评论也不该在构建期定值。
 *
 * 与下载量徽章（download-stats.tsx）沿用同一套约定：请求失败 / Worker 未部署时整体
 * 收起、静默降级，绝不给用户看报错；卸载时 abort，避免切页后回写已卸载组件。
 */
export function Comments({ pageId }: { pageId: string }) {
  const [items, setItems] = useState<CommentItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const [nick, setNick] = useState("");
  const [content, setContent] = useState("");
  // 蜜罐：真人看不见这个框，只有自动填表的机器人会填。服务端据此静默丢弃。
  const [hp, setHp] = useState("");
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // 待审条目只存在于本地，刷新即消失。作用是让作者确信「话确实发出去了」，
  // 同时诚实告知尚未公开 —— 先审模式下用户流失多半就是因为看不到自己的评论。
  const [localPending, setLocalPending] = useState<CommentItem[]>([]);
  // 加载成功后再淡入，避免整块内容硬邦邦地闪现。
  const [shown, setShown] = useState(false);

  // 表单渲染时刻。提交时上报「经过毫秒数」而非时间戳：差值不受客户端时钟偏移影响。
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    const ac = new AbortController();
    setItems(null);
    setFailed(false);
    setLocalPending([]);
    setReplyTo(null);
    setNotice(null);
    mountedAt.current = Date.now();

    fetch(`${commentsApi}?page=${encodeURIComponent(pageId)}`, {
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((data: { items?: CommentItem[] }) => {
        if (Array.isArray(data?.items)) setItems(data.items);
        else setFailed(true);
      })
      .catch(() => {
        // 切页触发的 abort 也会走到这里。此时新一轮 effect 已重置状态，
        // 不加这道判断会把刚重置的 failed 又翻回 true，评论区凭空消失。
        if (!ac.signal.aborted) setFailed(true);
      });

    return () => ac.abort();
  }, [pageId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NICK_STORAGE_KEY);
      if (saved) setNick(saved);
    } catch {
      // 隐私模式下 localStorage 可能直接抛错，昵称记不住而已，不影响发表。
    }
  }, []);

  const loaded = items !== null;
  useEffect(() => {
    if (!loaded) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [loaded]);

  const handleReply = useCallback((item: CommentItem) => {
    setReplyTo(item);
    setNotice(null);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmedNick = nick.trim();
    const trimmedContent = content.trim();
    setSubmitting(true);
    setNotice(null);

    try {
      const res = await fetch(commentsApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          page: pageId,
          nick: trimmedNick,
          content: trimmedContent,
          parent: replyTo?.id ?? null,
          elapsed: Date.now() - mountedAt.current,
          hp,
        }),
      });
      const data: SubmitResult = await res.json();

      if (!data.ok) {
        setNotice({
          kind: "error",
          text: data.message ?? "提交失败，请稍后重试",
        });
        return;
      }

      try {
        localStorage.setItem(NICK_STORAGE_KEY, trimmedNick);
      } catch {
        // 同上，记不住昵称不算失败。
      }

      const local: CommentItem = {
        // 负数 id 标记「本地临时条目」，不会与服务端自增 id 冲突。
        id: -Date.now(),
        parent: replyTo?.id ?? null,
        nick: trimmedNick,
        content: trimmedContent,
        createdAt: new Date().toISOString(),
      };

      if (data.status === "published") {
        // item 为 null 是服务端对可疑请求的伪装成功。这里用本地数据补齐，
        // 万一误伤真人，他看到的也是一切正常 —— 机器人同样无从分辨。
        setItems((prev) => [...(prev ?? []), data.item ?? local]);
        setNotice({ kind: "ok", text: "评论已发布" });
      } else {
        setLocalPending((prev) => [...prev, local]);
        setNotice({ kind: "info", text: "评论已提交，审核通过后显示" });
      }

      setContent("");
      setReplyTo(null);
      mountedAt.current = Date.now();
    } catch {
      setNotice({ kind: "error", text: "网络异常，请稍后重试" });
    } finally {
      setSubmitting(false);
    }
  }

  // 加载确认成功前不占据任何布局空间。若先撑开骨架、失败再整块抽走，页面会在滚动中
  // 骤然变短，体感像出了故障——底部区域「长出来」是温和的，「塌下去」不是。
  if (failed) {
    // 本地开发时给一句明确提示，免得以为组件写坏了。
    // process.env.NODE_ENV 是编译期常量，生产构建会把整个分支摇掉。
    if (process.env.NODE_ENV === "development") {
      return (
        <section className="mt-12 border-t pt-8 text-fd-muted-foreground text-sm">
          评论服务未连接：在 worker-comments 目录执行 pnpm dev 后刷新本页。
        </section>
      );
    }
    return null;
  }
  // 加载中也要把锚点占住。从留言总览页带 #comments 跳进来时，浏览器在页面就绪的
  // 那一刻就要找这个 id —— 那会儿评论还没 fetch 回来，返回 null 会让锚点落空、
  // 停在页顶，用户以为链接坏了。
  if (items === null)
    return <section id={COMMENTS_ANCHOR} className="mt-12 scroll-mt-20" />;

  const contentLen = [...content.trim()].length;
  const canSubmit =
    !submitting &&
    nick.trim().length > 0 &&
    contentLen >= 2 &&
    contentLen <= CONTENT_MAX;

  const tops = items.filter((i) => i.parent === null);
  const repliesOf = (id: number) => items.filter((i) => i.parent === id);
  const total = items.length + localPending.length;

  return (
    <section
      id={COMMENTS_ANCHOR}
      // scroll-mt 让锚点跳转停在标题下方而不是被 sticky 顶栏（h-14）盖住。
      className={`mt-12 scroll-mt-20 border-t pt-8 transition-opacity duration-300 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <h2 className="mb-4 font-semibold text-fd-foreground text-lg">
        评论
        {total > 0 && (
          <span className="ml-2 font-normal text-fd-muted-foreground text-sm">
            {total}
          </span>
        )}
      </h2>

      <form onSubmit={submit} className="rounded-lg border bg-fd-card/50 p-4">
        {replyTo && (
          <div className="mb-3 flex items-center gap-2 text-fd-muted-foreground text-sm">
            <span>
              回复 <span className="text-fd-foreground">{replyTo.nick}</span>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-fd-primary text-xs hover:underline"
            >
              取消
            </button>
          </div>
        )}

        <input
          type="text"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          maxLength={NICK_MAX}
          placeholder="昵称"
          aria-label="昵称"
          className="mb-2 w-40 rounded-md border bg-fd-background px-3 py-1.5 text-sm outline-none focus:border-fd-primary"
        />

        {/* 蜜罐。用绝对定位移出视口而非 display:none —— 部分机器人会跳过被隐藏的字段。 */}
        <input
          type="text"
          name="website"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="-left-[9999px] absolute h-0 w-0 opacity-0"
        />

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
                    : notice.kind === "ok"
                      ? "text-fd-primary"
                      : "text-fd-muted-foreground"
                }
              >
                {notice.text}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-fd-muted-foreground text-xs">
              {contentLen}/{CONTENT_MAX}
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

      <div className="mt-6">
        {total === 0 ? (
          <p className="py-6 text-center text-fd-muted-foreground text-sm">
            还没有评论，来说第一句吧
          </p>
        ) : (
          <ul className="space-y-5">
            {tops.map((item) => (
              <li key={item.id}>
                <Row item={item} onReply={handleReply} />
                {repliesOf(item.id).length > 0 && (
                  <ul className="mt-4 space-y-4 border-fd-border border-l pl-4">
                    {repliesOf(item.id).map((reply) => (
                      <li key={reply.id}>
                        <Row item={reply} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {localPending.map((item) => (
              <li key={item.id}>
                <Row item={item} pending />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Row({
  item,
  onReply,
  pending,
}: {
  item: CommentItem;
  onReply?: (item: CommentItem) => void;
  pending?: boolean;
}) {
  return (
    <div className={pending ? "opacity-60" : undefined}>
      <div className="flex items-center gap-2">
        <Avatar nick={item.nick} />
        <span className="font-medium text-fd-foreground text-sm">
          {item.nick}
        </span>
        <span className="text-fd-muted-foreground text-xs">
          {formatTime(item.createdAt)}
        </span>
        {pending && (
          <span className="rounded-full bg-fd-muted px-2 py-0.5 text-fd-muted-foreground text-xs">
            审核中
          </span>
        )}
      </div>
      {/* 正文是纯文本，交给 React 转义即可 —— 全站不存在把评论当 HTML 渲染的路径。 */}
      <p className="mt-1.5 whitespace-pre-wrap break-words pl-8 text-fd-foreground/90 text-sm">
        {item.content}
      </p>
      {onReply && !pending && (
        <button
          type="button"
          onClick={() => onReply(item)}
          className="mt-1.5 ml-8 text-fd-muted-foreground text-xs hover:text-fd-primary"
        >
          回复
        </button>
      )}
    </div>
  );
}

// 不收邮箱就没有 Gravatar，用昵称首字生成一个稳定的色块顶上，比空着好看。
const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-purple-500",
];

/**
 * 导出供留言总览页复用。共用同一个哈希函数是必要的，不是省事：
 * 同一个昵称在文档页和总览页必须是同一个颜色，否则读者认不出是同一个人。
 */
export function Avatar({ nick }: { nick: string }) {
  let hash = 0;
  for (let i = 0; i < nick.length; i++)
    hash = (hash * 31 + nick.charCodeAt(i)) >>> 0;
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-white text-xs ${color}`}
    >
      {[...nick][0] ?? "?"}
    </span>
  );
}
