// 评论接口，由 worker-comments/（叠加在 windinput.com/api/comments* 上的窄路由 Worker）提供。
//
// 生产用相对路径：Worker 与文档站同源，fetch 无跨域、无预检，可达性与站点完全一致。
// 开发指向本地 wrangler dev；没起 Worker 时前端静默降级，不显示评论区。
export const commentsApi =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8787/api/comments"
    : "/api/comments";

/**
 * 全站概览接口。Worker 路由是通配的 `windinput.com/api/comments*`，
 * 所以这个子路径无需改动任何路由配置就能生效。
 */
export const overviewApi = `${commentsApi}/overview`;

/** 文档页在评论区上的锚点 id。管理页与概览页的链接都指向它。 */
export const COMMENTS_ANCHOR = "comments";

/**
 * 留言功能的**构建期**总开关。改成 false 并重新部署，站点将彻底不含留言功能：
 * 文档页不渲染评论区、顶栏不显示入口、/comments 页不生成、sitemap 也不收录。
 *
 * 与运行时开关（存在 D1 的 settings.enabled，管理页一键切）分工不同，别混：
 *
 *   运行时开关  暂停 —— 手机上点一下即时生效，入口仍在，随时能开回来。
 *               应对「被刷爆了、先止血」。
 *   构建期开关  下架 —— 需要重新部署，站点上再看不出曾有过留言功能。
 *               应对「这个功能不要了」。
 *
 * 关掉它不影响 Worker 与 D1：数据都在，改回 true 重新部署即恢复。
 */
export const commentsEnabled = true;

export interface CommentItem {
  id: number;
  /** 所属楼层（顶层评论的 id）；顶层自身为 null。存储恒定只有两层 */
  parent: number | null;
  /**
   * 楼中回复的 @ 目标（同楼另一条的 id）；直接回复楼主时为 null。
   *
   * 二级 + @ 引用模型：交互上可以一直「回复回复」，但新评论的 parent 会被服务端提升到
   * 同一楼，只把被回复者记在这里，展示为「回复 @某某」。层级规则由 Worker 独家执行
   * （见 worker-comments/src/index.ts 的第 5 步），前端只负责报「在回复哪一条」。
   *
   * 这里只有 id 没有昵称：整页评论前端都有，查名字是本地一次 Map 命中。
   */
  replyTo: number | null;
  nick: string;
  content: string;
  createdAt: string;
}

/** 服务端对一次发表的判定。前端据此决定提示文案与列表行为。 */
export type SubmitStatus =
  | "published"
  | "pending"
  | "rate_limited"
  | "invalid"
  /** 留言已被运行时开关关停。正常情况下前端根本不会渲染出表单，
   *  但页面开着的时候管理员关了闸，这条提交就会撞上它。 */
  | "closed";

export interface SubmitResult {
  ok: boolean;
  status: SubmitStatus;
  item?: CommentItem | null;
  message?: string;
}

/** 概览里的一篇文档：有几条评论、最后一条是什么时候。 */
export interface PageSummary {
  /** 页面标识，即 fumadocs 的 page.url */
  page: string;
  count: number;
  lastAt: string;
}

/** 概览里的一条评论。比 CommentItem 多了来源页，少了 parent（概览不展示嵌套）。 */
export interface OverviewItem {
  id: number;
  page: string;
  nick: string;
  content: string;
  createdAt: string;
}

export interface OverviewData {
  pages: PageSummary[];
  items: OverviewItem[];
  total: number;
  /** 运行时开关处于关闭态。两个读接口都会带这个字段，前端据此整块收起。 */
  closed?: boolean;
}

/**
 * 通用留言板的页面标识。留言板不挂钩任何文档，但复用同一张 comments 表 ——
 * 它只是一个不对应任何文档的保留 page_id，于是限流、封禁、蜜罐、缓存、管理页操作
 * 全都原样适用，一处特例都不用开。
 *
 * 站点上没有 /board 这个路由：留言板挂在 /comments 页面的一个标签页里。
 * 必须与 Worker 侧的 BOARD_PAGE_ID 保持一致。
 */
export const BOARD_PAGE_ID = "/board";

/** 昵称记在本地，回访免填。键名带前缀避免与其他站点数据冲突。 */
export const NICK_STORAGE_KEY = "windinput-comment-nick";

/**
 * 正文草稿的存储键，按页面分开 —— 在文档 A 写了一半跳去文档 B，
 * 回来时 A 的草稿还应该在，共用一个键会互相覆盖。
 */
export function draftStorageKey(pageId: string): string {
  return `windinput-comment-draft:${pageId}`;
}

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
