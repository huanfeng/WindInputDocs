// 评论接口，由 worker-comments/（叠加在 windinput.com/api/comments* 上的窄路由 Worker）提供。
//
// 生产用相对路径：Worker 与文档站同源，fetch 无跨域、无预检，可达性与站点完全一致。
// 开发指向本地 wrangler dev；没起 Worker 时前端静默降级，不显示评论区。
export const commentsApi =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8787/api/comments"
    : "/api/comments";

export interface CommentItem {
  id: number;
  /** 回复目标；顶层为 null。只允许一层嵌套 */
  parent: number | null;
  nick: string;
  content: string;
  createdAt: string;
}

/** 服务端对一次发表的判定。前端据此决定提示文案与列表行为。 */
export type SubmitStatus = "published" | "pending" | "rate_limited" | "invalid";

export interface SubmitResult {
  ok: boolean;
  status: SubmitStatus;
  item?: CommentItem | null;
  message?: string;
}

/** 昵称记在本地，回访免填。键名带前缀避免与其他站点数据冲突。 */
export const NICK_STORAGE_KEY = "windinput-comment-nick";

export const CONTENT_MAX = 1000;
export const NICK_MAX = 20;

/**
 * 评论时间。今天的只给时分，更早的给日期——文档站评论看的是「新不新」，
 * 不需要精确到秒，也不值得为相对时间引入一个格式化库。
 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return `今天 ${hh}:${mm}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  return sameYear ? md : `${d.getFullYear()}年${md}`;
}
