// 文档页评论的数据层。后端是 forum.windinput.com 上的 Flarum，浏览器直连其 REST API。
//
// 为什么不再走 Worker：原先的 worker-comments 挂在 Cloudflare zone 上，主域解析交给
// EdgeOne 后那条路由必然失效（见 lib/comments.ts 的说明）。改用 Flarum 后没有中间层，
// 文档站是纯静态导出，所有请求由浏览器发出。
//
// 跨域能成立靠三件事，缺一不可：
//   1. openresty 在 forum 站点上按白名单发 CORS 头（只认 windinput.com），
//      并 Expose-Headers: X-CSRF-Token —— 不显式暴露的话 JS 读不到它。
//   2. fetch 带 credentials: "include"，浏览器才会附上 flarum_session。
//      cookie 按**目标域**发送，所以文档站页面发往 forum 的请求带的是 forum 的 cookie。
//   3. 二者同属 windinput.com（eTLD+1 相同）即 same-site，
//      因此 flarum_session 的 SameSite=Lax 不会拦截。
//
// 换句话说：登录态是**共享**的 —— 用户在论坛登录过，文档页就能直接发言，不需要二次登录。

import discussionMap from "@/../data/doc-discussions.json";

export const FLARUM_BASE = "https://forum.windinput.com";

/** 「文档反馈」板块的 tag id。同步脚本创建主题时挂在这个板块下。 */
export const DOCS_TAG_ID = 14;

/**
 * 文档路径 → Flarum 主题 id 的映射，由 scripts/sync-doc-discussions.mjs 生成。
 *
 * 为什么用构建期映射而不是运行时按标题搜索：Flarum 的 filter[q] 是 MySQL 全文检索，
 * 对 "/docs/guides/cli" 这种带斜杠和连字符的串会被分词打散，匹配既不精确也不稳定。
 * 映射表是一次生成、永久确定的查表，还顺带让「哪些文档已开评论」变成可 diff 的产物。
 */
const DISCUSSIONS = discussionMap as Record<string, number>;

export function discussionIdOf(pageId: string): number | null {
  return DISCUSSIONS[pageId] ?? null;
}

export interface FlarumUser {
  id: number;
  /** 显示名。站点 display_name_driver=nickname，所以这里通常是昵称而非用户名。 */
  displayName: string;
  avatarUrl: string | null;
  slug: string;
}

export interface FlarumComment {
  id: number;
  /** 已渲染的 HTML。Flarum 服务端已做净化，前端直接注入即可。 */
  contentHtml: string;
  createdAt: string;
  user: FlarumUser | null;
  /** 楼层号。Flarum 的 number 从 1 开始，1 是主题首帖（我们的「文档说明」楼）。 */
  number: number;
}

/** JSON:API 的响应形状只取我们用到的部分，不做完整建模。 */
interface JsonApiResource {
  type: string;
  id: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    { data?: { type: string; id: string } | null }
  >;
}

interface JsonApiDoc {
  data?: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  errors?: { status?: string; code?: string; detail?: string }[];
}

/**
 * CSRF token 缓存。
 *
 * Flarum 的写操作要求 X-CSRF-Token 与 session 配对，token 通过 GET /api 的响应头下发。
 * 每次发帖都先打一次 /api 是可以的，但那让「发表」变成两个来回；缓存起来，
 * 只在服务端判定 token 失效（419）时重取一次。
 */
let csrfToken: string | null = null;

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${FLARUM_BASE}${path}`, {
    ...init,
    // 没有这行，浏览器不会带上 flarum_session，所有请求都是匿名的 ——
    // 表现为「明明在论坛登录了，文档页却说未登录」。
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function ensureCsrf(force = false): Promise<string | null> {
  if (csrfToken && !force) return csrfToken;
  try {
    const res = await api("/api");
    csrfToken = res.headers.get("x-csrf-token");
    return csrfToken;
  } catch {
    return null;
  }
}

/** 把 included 数组按 type:id 建索引，避免每次查关联都线性扫。 */
function indexIncluded(
  included: JsonApiResource[] = [],
): Map<string, JsonApiResource> {
  const m = new Map<string, JsonApiResource>();
  for (const r of included) m.set(`${r.type}:${r.id}`, r);
  return m;
}

function toUser(r: JsonApiResource | undefined): FlarumUser | null {
  if (!r) return null;
  const a = r.attributes ?? {};
  return {
    id: Number(r.id),
    displayName: String(a.displayName ?? a.username ?? "匿名"),
    avatarUrl: (a.avatarUrl as string | null) ?? null,
    slug: String(a.slug ?? r.id),
  };
}

/**
 * 拉取一篇文档下的评论。
 *
 * 跳过 number === 1 的首帖：那是同步脚本创建主题时写的说明楼（指回文档链接），
 * 不是用户评论。展示出来会让每篇文档的评论区都顶着一条机器人发言。
 */
export async function fetchComments(
  discussionId: number,
): Promise<FlarumComment[] | null> {
  try {
    const res = await api(
      `/api/discussions/${discussionId}?include=posts,posts.user`,
    );
    if (!res.ok) return null;
    const doc = (await res.json()) as JsonApiDoc;
    const idx = indexIncluded(doc.included);

    const out: FlarumComment[] = [];
    for (const r of doc.included ?? []) {
      if (r.type !== "posts") continue;
      const a = r.attributes ?? {};
      // 只要普通可见的评论：Flarum 的 discussion-renamed 之类是事件帖，
      // 被删除的帖 contentHtml 为空。
      if (a.contentType !== "comment") continue;
      if (a.isHidden === true) continue;
      const number = Number(a.number ?? 0);
      if (number === 1) continue;

      const userRef = r.relationships?.user?.data;
      out.push({
        id: Number(r.id),
        contentHtml: String(a.contentHtml ?? ""),
        createdAt: String(a.createdAt ?? ""),
        number,
        user: toUser(
          userRef ? idx.get(`${userRef.type}:${userRef.id}`) : undefined,
        ),
      });
    }
    out.sort((x, y) => x.number - y.number);
    return out;
  } catch {
    // 静默降级：与下载量徽章、旧评论区沿用同一约定 —— 后端不可达时整块收起，
    // 绝不给读文档的人看一条报错。
    return null;
  }
}

/** 当前登录用户；未登录或请求失败都返回 null。 */
export async function fetchMe(): Promise<FlarumUser | null> {
  try {
    const res = await api("/api");
    if (!res.ok) return null;
    csrfToken = res.headers.get("x-csrf-token") ?? csrfToken;
    const doc = (await res.json()) as JsonApiDoc;
    const idx = indexIncluded(doc.included);
    // /api 的 data 是 forum 资源，当前用户挂在它的 actor 关联上
    const forum = Array.isArray(doc.data) ? doc.data[0] : doc.data;
    const ref = forum?.relationships?.actor?.data;
    if (!ref) return null;
    return toUser(idx.get(`${ref.type}:${ref.id}`));
  } catch {
    return null;
  }
}

export type PostResult =
  | { ok: true; comment: FlarumComment }
  | {
      ok: false;
      reason: "unauthenticated" | "rate_limited" | "invalid" | "network";
    };

/**
 * 发表一条评论。
 *
 * 419 时重取一次 CSRF token 再试：token 随 session 轮换，页面开着不动一晚上，
 * 缓存的那个就过期了。不重试的话用户看到的是「发表失败」，刷新页面又好了 ——
 * 这种偶发失败最难被报告清楚。
 */
export async function postComment(
  discussionId: number,
  content: string,
): Promise<PostResult> {
  const body = JSON.stringify({
    data: {
      type: "posts",
      attributes: { content },
      relationships: {
        discussion: { data: { type: "discussions", id: String(discussionId) } },
      },
    },
  });

  const send = async (token: string | null) =>
    api("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CSRF-Token": token } : {}),
      },
      body,
    });

  try {
    let res = await send(await ensureCsrf());
    if (res.status === 419) res = await send(await ensureCsrf(true));

    if (res.status === 401 || res.status === 403)
      return { ok: false, reason: "unauthenticated" };
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (!res.ok) return { ok: false, reason: "invalid" };

    const doc = (await res.json()) as JsonApiDoc;
    const r = Array.isArray(doc.data) ? doc.data[0] : doc.data;
    if (!r) return { ok: false, reason: "invalid" };
    const a = r.attributes ?? {};
    const idx = indexIncluded(doc.included);
    const userRef = r.relationships?.user?.data;
    return {
      ok: true,
      comment: {
        id: Number(r.id),
        contentHtml: String(a.contentHtml ?? ""),
        createdAt: String(a.createdAt ?? new Date().toISOString()),
        number: Number(a.number ?? 0),
        user: toUser(
          userRef ? idx.get(`${userRef.type}:${userRef.id}`) : undefined,
        ),
      },
    };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/**
 * 登录入口：论坛首页。
 *
 * ⚠️ 这里**不能**指向 `/login`。原先那样写是基于一个错误的假设——以为它会打开
 * 首页并弹出登录框。实测 `GET /login` 返回 **405 Method Not Allowed**：
 * Flarum core 确实注册了这个路径，但它只接受 POST，那是登录表单的提交端点，
 * 不是给人访问的页面。`/register` 同理。
 *
 * Flarum 的登录是个模态框，没有独立页面，也没有能从 URL 触发它的机制
 * （试过 `/?login`、`/auth/login`、`/u/login`，要么 404 要么就是普通首页）。
 * 所以只能把人送到首页，由他自己点右上角的登录。
 *
 * 也因此没有 return 参数可带——跳不回来。这是目前的取舍：在文档站里重实现
 * 一遍登录表单要处理密码、二步验证、第三方登录，那些都不该复制一份。
 */
export function loginUrl(): string {
  return `${FLARUM_BASE}/`;
}

export function discussionUrl(discussionId: number): string {
  return `${FLARUM_BASE}/d/${discussionId}`;
}

/** 评论正文长度上限。与 Flarum 后端保持一致，超了那边会报 invalid。 */
export const CONTENT_MAX = 2000;

/**
 * 评论时间。今天的只给时分，更早的给日期 —— 与旧评论区口径一致，
 * 文档评论看的是「新不新」，不值得为相对时间引入格式化库。
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
