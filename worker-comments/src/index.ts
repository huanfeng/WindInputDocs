/**
 * 清风输入法文档站评论 Worker
 *
 * 以窄路由 `windinput.com/api/comments*` 叠加在 Pages 站点上（见 wrangler.jsonc），
 * 与文档站同源 —— 前端无跨域、无预检，可达性与站点本身完全一致。
 *
 * 职责：
 *   1. GET  /api/comments?page=<pageId>  —— 取该页公开评论，带 60 秒边缘缓存。
 *   2. POST /api/comments                —— 发表评论，服务端反垃圾后入库。
 *   3. GET  /api/comments/overview       —— 全站概览：哪些页有评论 + 最近 N 条，同样带缓存。
 *   4. GET  /api/comments/admin?token=   —— 极简管理页（HTML），手机浏览器可直接操作。
 *   5. POST /api/comments/admin          —— 放行 / 删除 / 封禁 / 切换审核策略 / 开关留言。
 *
 * 设计取舍：
 *   - **不接验证码**。Turnstile 的 challenges.cloudflare.com 在大陆访问很慢，接它等于
 *     给站点引入一个比自身更差的可达点。反垃圾全部在服务端完成，用户零感知。
 *   - **不收邮箱、不存明文 IP**。限流与封禁用加盐哈希足够，少收一样数据少一分负担。
 *   - **正文只存纯文本**，展示端不解析 HTML / Markdown，XSS 攻击面直接归零。
 */

interface Env {
  DB: D1Database;
  /** 允许的前端来源，用于 CORS。同源部署时用不上，本地开发与子域回退方案必需。 */
  SITE_ORIGIN: string;
  /** 管理端密钥，`wrangler secret put ADMIN_TOKEN` */
  ADMIN_TOKEN: string;
  /** IP 哈希盐，`wrangler secret put IP_SALT` */
  IP_SALT: string;
  /** Telegram 通知，两者都缺则静默跳过通知 */
  TG_BOT_TOKEN?: string;
  TG_CHAT_ID?: string;
}

const STATUS = { pending: 0, published: 1, removed: 2 } as const;

/** 审核策略。存库而非存环境变量，理由见 schema.sql。 */
type Moderation = "open" | "review" | "first";

/**
 * 留言总开关（运行时）。同样存库：需要紧急关停的场景就是「被刷爆了、人不在电脑前」，
 * 存环境变量意味着必须找到装了 wrangler 的机器，那时候就晚了。
 *
 * off 时三个公开接口一律回空、发表被拒，但 handleAdmin **不受约束** ——
 * 关停是为了止血后清理，不是为了把自己也关在门外。
 */
type Enabled = "on" | "off";

const LIMITS = {
  nickMax: 20,
  contentMin: 2,
  contentMax: 1000,
  /** 填写耗时下限：真人写完一条评论不可能快过这个数，低于即判机器人 */
  minElapsedMs: 3000,
  /** 表单存活上限：页面开着一整天再提交，多半是自动化或陈旧标签页 */
  maxElapsedMs: 6 * 60 * 60 * 1000,
  /** 短窗限流：60 秒内同一来源最多 1 条 */
  burstWindowMs: 60_000,
  burstMax: 1,
  /** 长窗限流：24 小时内同一来源最多 10 条 */
  dayWindowMs: 24 * 60 * 60 * 1000,
  dayMax: 10,
  /** 正文含 URL 达到此数量即转待审（不拒绝，交给人判断） */
  linkThreshold: 2,
  /** 单页返回上限。文档页评论不会多到需要翻页，超出部分截断即可 */
  listMax: 200,
  /** 全站概览返回的最近评论条数。概览回答的是「有什么新的」而不是「全部历史」，无需翻页 */
  overviewMax: 50,
  /** 管理页每类列表条数 */
  adminMax: 50,
} as const;

/** 敏感词命中即转待审。留空数组，按实际情况再填。 */
const SENSITIVE_WORDS: string[] = [];

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request.headers.get("origin"));

    // 顶层兜底。没有它，D1 抖动之类的异常会落到 wrangler 的默认错误中间件，
    // 返回一个**不带 CORS 头**的 500 —— 浏览器把它报成跨域错误，前端连
    // 「请求失败」都判断不出来。包一层，故障时前端才能按设计静默收起评论区。
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }

      if (url.pathname === "/api/comments") {
        if (request.method === "GET") return await handleList(request, env, ctx, cors);
        if (request.method === "POST") return await handlePost(request, env, ctx, cors);
        return methodNotAllowed(cors, "GET, POST, OPTIONS");
      }

      if (url.pathname === "/api/comments/overview") {
        if (request.method === "GET") return await handleOverview(request, env, ctx, cors);
        return methodNotAllowed(cors, "GET, OPTIONS");
      }

      if (url.pathname === "/api/comments/admin") {
        return await handleAdmin(request, env, cors);
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      console.error("unhandled", err);
      return json({ error: "internal" }, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;

// ─────────────────────────────── 读取 ───────────────────────────────

async function handleList(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  cors: Record<string, string>,
): Promise<Response> {
  const pageId = normalizePageId(
    new URL(request.url).searchParams.get("page"),
  );
  if (!pageId) return json({ error: "invalid page" }, 400, cors);

  // 边缘缓存：文档页每次访问都会拉一次列表，没有这层缓存，页面流量会 1:1 打到 D1 读上。
  // 发表成功后会主动删除对应缓存，所以新评论不会因为缓存而延迟可见。
  const cache = caches.default;
  const cacheKey = listCacheKey(request.url, pageId);
  const hit = await cache.match(cacheKey);
  if (hit) return withHeaders(hit, cors);

  // 缓存未命中才查总开关。命中即说明留言是开着的 —— 关闭态的响应从不写入缓存
  // （见下方 closedResponse 的注释），所以缓存里不可能存在「关闭」这个状态。
  if ((await getEnabled(env)) === "off") return closedResponse(cors);

  const { results } = await env.DB.prepare(
    `SELECT id, parent_id, nick, content, created_at
       FROM comments
      WHERE page_id = ?1 AND status = ?2
      ORDER BY id ASC
      LIMIT ?3`,
  )
    .bind(pageId, STATUS.published, LIMITS.listMax)
    .all<CommentRow>();

  const items = (results ?? []).map(toItem);
  const cached = new Response(
    JSON.stringify({ items, total: items.length }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    },
  );

  ctx.waitUntil(cache.put(cacheKey, cached.clone()));
  return withHeaders(cached, cors);
}

/**
 * 全站概览。文档页有四十多篇，评论散在各页里，不逐页翻就不知道哪儿有讨论 ——
 * 这个接口是站点「留言」入口与管理页共同的数据来源。
 *
 * 一次返回两份数据而不是拆成两个接口：前端两个视图都要，拆开就是两次往返、
 * 两份缓存要各自失效。pages 的行数等于「有评论的页面数」，最多几十行，不重。
 *
 * 正文刻意不截断。50 条约 5 KB，截断省不下多少，却会让「在概览页直接读完一条
 * 短评论」变得不可能 —— 折行交给前端 CSS 处理。
 */
async function handleOverview(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  cors: Record<string, string>,
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = overviewCacheKey(request.url);
  const hit = await cache.match(cacheKey);
  if (hit) return withHeaders(hit, cors);

  if ((await getEnabled(env)) === "off") return closedResponse(cors);

  // 两条独立只读查询，用 Promise.all 而非 DB.batch：batch 的泛型只有一个，
  // 而这两条返回的行形状不同，套 batch 就得靠 as 强转把类型信息丢掉。
  // 且 batch 的价值是事务性，只读聚合并不需要。
  const [pages, items] = await Promise.all([
    // GROUP BY page_id 走 idx_comments_page(page_id, status, id)。
    // 按最后评论时间倒序：概览关心的是「哪页最近有人说话」，不是哪页评论最多。
    env.DB.prepare(
      `SELECT page_id, COUNT(*) AS count, MAX(created_at) AS last_at
         FROM comments
        WHERE status = ?1
        GROUP BY page_id
        ORDER BY last_at DESC`,
    )
      .bind(STATUS.published)
      .all<OverviewPageRow>(),
    // 跨页时间流。走 idx_comments_status(status, id)，id 倒序即时间倒序。
    env.DB.prepare(
      `SELECT id, page_id, nick, content, created_at
         FROM comments
        WHERE status = ?1
        ORDER BY id DESC
        LIMIT ?2`,
    )
      .bind(STATUS.published, LIMITS.overviewMax)
      .all<OverviewItemRow>(),
  ]);

  const pageRows = pages.results ?? [];
  const itemRows = items.results ?? [];

  const cached = new Response(
    JSON.stringify({
      pages: pageRows.map((r) => ({
        page: r.page_id,
        count: r.count,
        lastAt: r.last_at,
      })),
      items: itemRows.map((r) => ({
        id: r.id,
        page: r.page_id,
        nick: r.nick,
        content: r.content,
        createdAt: r.created_at,
      })),
      total: pageRows.reduce((sum, r) => sum + r.count, 0),
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    },
  );

  ctx.waitUntil(cache.put(cacheKey, cached.clone()));
  return withHeaders(cached, cors);
}

// ─────────────────────────────── 发表 ───────────────────────────────

async function handlePost(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  cors: Record<string, string>,
): Promise<Response> {
  const body = await readJson(request);
  if (!body) return fail("invalid", "请求格式有误", cors);

  // 1. 蜜罐。真人看不见这个字段，只有自动填表的机器人会填。
  //    返回伪装的成功 —— 不给机器人任何「被识破」的反馈信号，否则它会换策略重试。
  if (typeof body.hp === "string" && body.hp.trim() !== "") {
    return json({ ok: true, status: "published", item: null }, 200, cors);
  }

  // 2. 填写耗时。用前端自算的经过毫秒数而非时间戳 —— 时间戳会被客户端时钟偏移干扰，
  //    差值不会。机器人当然能伪造，但通用垃圾机器人不会为单个站点定制。
  const elapsed = Number(body.elapsed);
  if (!Number.isFinite(elapsed) || elapsed < LIMITS.minElapsedMs) {
    return json({ ok: true, status: "published", item: null }, 200, cors);
  }
  if (elapsed > LIMITS.maxElapsedMs) {
    return fail("invalid", "页面开启太久，请刷新后重试", cors);
  }

  // 3. 总开关。放在蜜罐与耗时之后：那两条是对机器人的静默丢弃，语义上与开关无关，
  //    先跑完它们，机器人拿到的仍是伪装的成功，不会得到「这站关停了」这条额外情报。
  //    对真人则明确告知，而不是让提交石沉大海。
  if ((await getEnabled(env)) === "off") {
    return fail("closed", "留言功能已关闭", cors);
  }

  // 4. 字段校验
  const pageId = normalizePageId(body.page);
  if (!pageId) return fail("invalid", "页面标识有误", cors);

  const nick = cleanText(body.nick, false);
  if (!nick) return fail("invalid", "请填写昵称", cors);
  if (charLength(nick) > LIMITS.nickMax) {
    return fail("invalid", `昵称不能超过 ${LIMITS.nickMax} 个字`, cors);
  }

  const content = cleanText(body.content, true);
  if (!content) return fail("invalid", "请填写评论内容", cors);
  const contentLen = charLength(content);
  if (contentLen < LIMITS.contentMin) {
    return fail("invalid", `评论至少 ${LIMITS.contentMin} 个字`, cors);
  }
  if (contentLen > LIMITS.contentMax) {
    return fail("invalid", `评论不能超过 ${LIMITS.contentMax} 个字`, cors);
  }

  // 5. 回复目标。只允许一层嵌套：parent 必须存在、同页、且自身是顶层。
  let parentId: number | null = null;
  if (body.parent !== undefined && body.parent !== null) {
    const pid = Number(body.parent);
    if (!Number.isInteger(pid) || pid <= 0) {
      return fail("invalid", "回复目标有误", cors);
    }
    const parent = await env.DB.prepare(
      `SELECT id FROM comments
        WHERE id = ?1 AND page_id = ?2 AND status = ?3 AND parent_id IS NULL`,
    )
      .bind(pid, pageId, STATUS.published)
      .first<{ id: number }>();
    if (!parent) return fail("invalid", "回复的评论不存在或已被删除", cors);
    parentId = pid;
  }

  // 6. 来源哈希、封禁、限流
  const ip = request.headers.get("cf-connecting-ip") ?? "0.0.0.0";
  const ipHash = await hashIp(ip, env.IP_SALT);

  const banned = await env.DB.prepare(
    "SELECT ip_hash FROM bans WHERE ip_hash = ?1",
  )
    .bind(ipHash)
    .first();
  // 已封禁：同样返回伪装成功。让对方以为发出去了，比明确拒绝更能减少换 IP 重试。
  if (banned) return json({ ok: true, status: "published", item: null }, 200, cors);

  const now = Date.now();
  const rate = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN created_at > ?2 THEN 1 ELSE 0 END) AS burst,
       COUNT(*) AS day
     FROM comments
     WHERE ip_hash = ?1 AND created_at > ?3`,
  )
    .bind(
      ipHash,
      new Date(now - LIMITS.burstWindowMs).toISOString(),
      new Date(now - LIMITS.dayWindowMs).toISOString(),
    )
    .first<{ burst: number | null; day: number | null }>();

  if ((rate?.burst ?? 0) >= LIMITS.burstMax) {
    return fail("rate_limited", "发言太频繁，请稍后再试", cors);
  }
  if ((rate?.day ?? 0) >= LIMITS.dayMax) {
    return fail("rate_limited", "今天发言次数已达上限，明天再来吧", cors);
  }

  // 7. 内容可疑度 + 审核策略，共同决定最终状态
  const suspicious = isSuspicious(content);
  const mode = await getModeration(env);
  const status = await resolveStatus(env, mode, suspicious, ipHash);

  const createdAt = new Date(now).toISOString();
  const inserted = await env.DB.prepare(
    `INSERT INTO comments (page_id, parent_id, nick, content, status, ip_hash, ua, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     RETURNING id, parent_id, nick, content, created_at`,
  )
    .bind(
      pageId,
      parentId,
      nick,
      content,
      status,
      ipHash,
      (request.headers.get("user-agent") ?? "").slice(0, 300),
      createdAt,
    )
    .first<CommentRow>();

  if (!inserted) return fail("invalid", "保存失败，请稍后重试", cors);

  // 副作用与响应解耦：删缓存与推送都放后台，失败不影响用户已经成功的这次发表。
  ctx.waitUntil(
    (async () => {
      if (status === STATUS.published) {
        await purgeCaches(request.url, [pageId]);
      }
      await notifyTelegram(env, {
        pageId,
        nick,
        content,
        status,
        id: inserted.id,
      });
    })(),
  );

  return json(
    {
      ok: true,
      status: status === STATUS.published ? "published" : "pending",
      item: status === STATUS.published ? toItem(inserted) : null,
    },
    200,
    cors,
  );
}

/** 按当前策略与内容可疑度决定入库状态。 */
async function resolveStatus(
  env: Env,
  mode: Moderation,
  suspicious: boolean,
  ipHash: string,
): Promise<number> {
  if (mode === "review") return STATUS.pending;
  if (suspicious) return STATUS.pending;
  if (mode === "first") {
    // 同一来源此前有过通过的评论就直接放行，只拦真正的「首次发言」。
    const seen = await env.DB.prepare(
      "SELECT 1 AS ok FROM comments WHERE ip_hash = ?1 AND status = ?2 LIMIT 1",
    )
      .bind(ipHash, STATUS.published)
      .first();
    return seen ? STATUS.published : STATUS.pending;
  }
  return STATUS.published;
}

/** 可疑内容不拒绝，只转待审 —— 规则再准也会误伤，让人来判断。 */
function isSuspicious(content: string): boolean {
  const links = content.match(/https?:\/\/|www\./gi);
  if (links && links.length >= LIMITS.linkThreshold) return true;
  const lower = content.toLowerCase();
  return SENSITIVE_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

// ─────────────────────────────── 管理 ───────────────────────────────

async function handleAdmin(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    // 鉴权失败一律回 404，不暴露这个端点的存在。
    if (!env.ADMIN_TOKEN || !safeEqual(token, env.ADMIN_TOKEN)) {
      return new Response("Not Found", { status: 404 });
    }
    const data = await loadAdminData(env);
    if (url.searchParams.get("format") === "json") {
      return json(data, 200, cors);
    }
    return new Response(renderAdminPage(data, token, env.SITE_ORIGIN), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (request.method !== "POST") {
    return methodNotAllowed(cors, "GET, POST, OPTIONS");
  }

  const body = await readJson(request);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!env.ADMIN_TOKEN || !safeEqual(token, env.ADMIN_TOKEN)) {
    return new Response("Not Found", { status: 404 });
  }

  switch (body?.action) {
    case "moderate": {
      const id = Number(body.id);
      const next = Number(body.status);
      if (!Number.isInteger(id) || ![0, 1, 2].includes(next)) {
        return json({ error: "invalid args" }, 400, cors);
      }
      // 先取 page_id 才能定点清缓存。多一次读，换「点了放行，刷新页面就看得见」。
      const row = await env.DB.prepare(
        "SELECT page_id FROM comments WHERE id = ?1",
      )
        .bind(id)
        .first<{ page_id: string }>();
      await env.DB.prepare("UPDATE comments SET status = ?1 WHERE id = ?2")
        .bind(next, id)
        .run();
      if (row) await purgeCaches(request.url, [row.page_id]);
      return json({ ok: true }, 200, cors);
    }
    case "set-enabled": {
      const value = String(body.value);
      if (value !== "on" && value !== "off") {
        return json({ error: "invalid value" }, 400, cors);
      }
      await env.DB.prepare(
        "INSERT INTO settings (key, value) VALUES ('enabled', ?1) " +
          "ON CONFLICT(key) DO UPDATE SET value = ?1",
      )
        .bind(value)
        .run();
      // 必须清掉全部缓存，否则「关闭」要等最多 60 秒才见效 —— 那就谈不上「直接关闭」了。
      // 总开关影响每一页，所以取全表的 DISTINCT page_id 逐个清。页面数最多几十，不重。
      //
      // 重新打开时其实无需再清（关闭期间的响应带 no-store，从未入缓存），
      // 但两个方向都清更好记，也省得日后有人改了 no-store 就埋下一个隐雷。
      const all = await env.DB.prepare(
        "SELECT DISTINCT page_id FROM comments",
      ).all<{ page_id: string }>();
      await purgeCaches(
        request.url,
        (all.results ?? []).map((r) => r.page_id),
      );
      return json({ ok: true, enabled: value }, 200, cors);
    }
    case "set-moderation": {
      const value = String(body.value);
      if (!["open", "review", "first"].includes(value)) {
        return json({ error: "invalid mode" }, 400, cors);
      }
      await env.DB.prepare(
        "INSERT INTO settings (key, value) VALUES ('moderation', ?1) " +
          "ON CONFLICT(key) DO UPDATE SET value = ?1",
      )
        .bind(value)
        .run();
      return json({ ok: true, moderation: value }, 200, cors);
    }
    case "ban": {
      const id = Number(body.id);
      if (!Number.isInteger(id)) return json({ error: "invalid id" }, 400, cors);
      const row = await env.DB.prepare(
        "SELECT ip_hash FROM comments WHERE id = ?1",
      )
        .bind(id)
        .first<{ ip_hash: string | null }>();
      if (!row?.ip_hash) return json({ error: "not found" }, 404, cors);
      // 封禁会连坐下架该来源的全部评论，可能横跨多页 —— 下架前先把涉及的页记下来，
      // 否则 UPDATE 之后就查不到「这些评论原本在哪些页」了。
      const affected = await env.DB.prepare(
        "SELECT DISTINCT page_id FROM comments WHERE ip_hash = ?1",
      )
        .bind(row.ip_hash)
        .all<{ page_id: string }>();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT OR IGNORE INTO bans (ip_hash, reason, created_at) VALUES (?1, ?2, ?3)",
        ).bind(row.ip_hash, `from comment #${id}`, new Date().toISOString()),
        // 连坐：把该来源的全部评论一并下架。
        env.DB.prepare(
          "UPDATE comments SET status = ?1 WHERE ip_hash = ?2",
        ).bind(STATUS.removed, row.ip_hash),
      ]);
      await purgeCaches(
        request.url,
        (affected.results ?? []).map((r) => r.page_id),
      );
      return json({ ok: true }, 200, cors);
    }
    default:
      return json({ error: "unknown action" }, 400, cors);
  }
}

interface AdminData {
  enabled: Enabled;
  moderation: Moderation;
  pending: AdminRow[];
  recent: AdminRow[];
  /**
   * 已删除（status=2）。删除本就是可逆的——只改状态，正文一直在库里——但此前
   * 管理页只查 0/1 两种状态，删掉的条目就此从界面上消失，误删无从挽回。
   */
  removed: AdminRow[];
  /** 按文档聚合。回答「哪些页有评论、各几条」—— 扁平的时间流答不了这个问题。 */
  pages: AdminPageRow[];
}

interface AdminPageRow {
  page_id: string;
  published: number;
  pending: number;
  last_at: string;
}

interface AdminRow {
  id: number;
  page_id: string;
  nick: string;
  content: string;
  status: number;
  created_at: string;
}

async function loadAdminData(env: Env): Promise<AdminData> {
  const [enabled, moderation, pending, recent, removed, pages] = await Promise.all([
    getEnabled(env),
    getModeration(env),
    env.DB.prepare(
      `SELECT id, page_id, nick, content, status, created_at
         FROM comments WHERE status = ?1 ORDER BY id DESC LIMIT ?2`,
    )
      .bind(STATUS.pending, LIMITS.adminMax)
      .all<AdminRow>(),
    env.DB.prepare(
      `SELECT id, page_id, nick, content, status, created_at
         FROM comments WHERE status = ?1 ORDER BY id DESC LIMIT ?2`,
    )
      .bind(STATUS.published, LIMITS.adminMax)
      .all<AdminRow>(),
    env.DB.prepare(
      `SELECT id, page_id, nick, content, status, created_at
         FROM comments WHERE status = ?1 ORDER BY id DESC LIMIT ?2`,
    )
      .bind(STATUS.removed, LIMITS.adminMax)
      .all<AdminRow>(),
    // 一趟出公开数与待审数：SUM(CASE …) 比查两次再在内存里合并简单得多。
    // 已删除（status=2）不计入，管理页概览要反映的是「现在页面上有什么」。
    env.DB.prepare(
      `SELECT page_id,
              SUM(CASE WHEN status = ?1 THEN 1 ELSE 0 END) AS published,
              SUM(CASE WHEN status = ?2 THEN 1 ELSE 0 END) AS pending,
              MAX(created_at) AS last_at
         FROM comments
        WHERE status IN (?1, ?2)
        GROUP BY page_id
        ORDER BY last_at DESC`,
    )
      .bind(STATUS.published, STATUS.pending)
      .all<AdminPageRow>(),
  ]);
  return {
    enabled,
    moderation,
    pending: pending.results ?? [],
    recent: recent.results ?? [],
    removed: removed.results ?? [],
    pages: pages.results ?? [],
  };
}

/**
 * 极简管理页。刻意做成单文件内联 HTML —— Telegram 推来的链接要能在手机上直接点开操作，
 * 光返回 JSON 就只能看不能动。评论内容一律转义后再插入，管理页自己不能变成 XSS 入口。
 */
function renderAdminPage(
  data: AdminData,
  token: string,
  siteOrigin: string,
): string {
  const modeLabel: Record<Moderation, string> = {
    open: "直接公开",
    review: "全部先审",
    first: "首评先审",
  };
  // 页面直链。原先 page_id 只是一段纯文本，看到有人在某页提问，还得手动拼 URL
  // 才能过去看上下文 —— 这是管理页此前最直接的摩擦。#comments 锚点直接落到评论区。
  const pageLink = (pageId: string) =>
    `<a href="${escapeHtml(siteOrigin + pageId)}#comments" target="_blank" rel="noopener">${escapeHtml(pageId)}</a>`;
  const card = (row: AdminRow) => `
    <div class="c">
      <div class="m">#${row.id} · ${escapeHtml(row.nick)} · ${pageLink(row.page_id)} · ${escapeHtml(row.created_at)}</div>
      <div class="t">${escapeHtml(row.content)}</div>
      <div class="b">
        ${
          row.status !== STATUS.published
            ? // 已删除条目的这个按钮是「恢复」而不是「放行」：两者动作相同（改回
              // status=1），但站在被删内容前，「恢复」才说得清会发生什么。
              `<button onclick="act('moderate',${row.id},1)">${row.status === STATUS.removed ? "恢复" : "放行"}</button>`
            : ""
        }
        ${row.status !== STATUS.removed ? `<button onclick="act('moderate',${row.id},2)">删除</button>` : ""}
        <button class="d" onclick="act('ban',${row.id})">封禁来源</button>
      </div>
    </div>`;

  return `<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>评论管理</title><style>
body{font:15px/1.6 system-ui,sans-serif;margin:0;padding:16px;max-width:760px;background:#fafafa;color:#111}
h2{font-size:16px;margin:24px 0 8px}
.c{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:12px;margin-bottom:10px}
.m{font-size:12px;color:#888;word-break:break-all}
.t{margin:8px 0;white-space:pre-wrap;word-break:break-word}
button{font:inherit;padding:5px 12px;margin-right:6px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer}
button.d{color:#c00;border-color:#f0bbbb}
.mode{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:12px;margin-bottom:10px}
.mode b{color:#0a0}
.off{background:#fff4f4;border-color:#f0bbbb}
.off b{color:#c00}
.off .hint{font-size:13px;color:#a55;margin-top:6px}
.empty{color:#999;font-size:14px}
a{color:#06c}
.p{display:flex;align-items:baseline;gap:8px;padding:7px 0;border-bottom:1px solid #f0f0f0}
.p:last-child{border-bottom:0}
.p a{flex:1;min-width:0;word-break:break-all}
.p .n{font-size:13px;color:#888;white-space:nowrap}
.p .w{color:#c60;font-weight:600}
/* 已删除区默认折叠。用原生 details 而不是 JS 切换的筛选器：零脚本、手机上原生可用，
   且日常不占版面——删除多是批量清垃圾，那堆内容平时没人想看见，需要时再展开找回。 */
details{margin-top:24px}
summary{font-size:16px;font-weight:600;cursor:pointer;padding:4px 0;color:#666}
details[open] summary{margin-bottom:8px}
</style></head><body>
<div class="mode${data.enabled === "off" ? " off" : ""}">留言功能：<b>${
    data.enabled === "off" ? "已关闭" : "开启中"
  }</b><div style="margin-top:8px">
${
  data.enabled === "off"
    ? `<button onclick="enable('on')">重新开启</button>`
    : `<button class="d" onclick="enable('off')">关闭留言</button>`
}
</div>${
    data.enabled === "off"
      ? `<div class="hint">站点上评论区已整块隐藏，访客看不到任何留言、也无法发表。数据仍在，重新开启即原样恢复。本页不受影响，可继续清理。</div>`
      : ""
  }</div>
<div class="mode">当前审核策略：<b>${modeLabel[data.moderation]}</b><div style="margin-top:8px">
<button onclick="mode('open')">直接公开</button>
<button onclick="mode('review')">全部先审</button>
<button onclick="mode('first')">首评先审</button>
</div></div>
<h2>按文档 (${data.pages.length})</h2>
${
  data.pages.length
    ? `<div class="c">${data.pages
        .map(
          (p) => `<div class="p">${pageLink(p.page_id)}<span class="n">${
            p.pending > 0 ? `<span class="w">待审 ${p.pending}</span> · ` : ""
          }${p.published} 条 · ${escapeHtml(p.last_at.slice(0, 10))}</span></div>`,
        )
        .join("")}</div>`
    : '<div class="empty">还没有任何文档收到评论</div>'
}
<h2>待审 (${data.pending.length})</h2>
${data.pending.length ? data.pending.map(card).join("") : '<div class="empty">没有待审评论</div>'}
<h2>最近公开 (${data.recent.length})</h2>
${data.recent.length ? data.recent.map(card).join("") : '<div class="empty">还没有评论</div>'}
<details>
<summary>已删除 (${data.removed.length})</summary>
${data.removed.length ? data.removed.map(card).join("") : '<div class="empty">没有已删除的评论</div>'}
</details>
<script>
const TOKEN=${JSON.stringify(token)};
async function post(payload){
  const r=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({...payload,token:TOKEN})});
  if(r.ok)location.reload();else alert('操作失败：'+r.status);
}
function act(action,id,status){post({action,id,status})}
function mode(value){post({action:'set-moderation',value})}
// 关闭是会立刻改变站点外观的操作，加一道确认；重新开启无需确认。
function enable(value){
  if(value==='off'&&!confirm('确定关闭留言？站点上的评论区会立刻整块隐藏。'))return;
  post({action:'set-enabled',value});
}
</script></body></html>`;
}

// ─────────────────────────────── 通知 ───────────────────────────────

/**
 * Telegram 推送。这条链路由 Cloudflare 边缘发起，不受大陆网络限制，比邮件方案更可靠。
 * 不指定 parse_mode，按纯文本发送 —— 免去转义，评论里的特殊字符不会破坏消息结构。
 */
async function notifyTelegram(
  env: Env,
  c: {
    pageId: string;
    nick: string;
    content: string;
    status: number;
    id: number;
  },
): Promise<void> {
  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return;

  const flag = c.status === STATUS.published ? "已公开" : "待审核";
  const preview =
    c.content.length > 200 ? `${c.content.slice(0, 200)}…` : c.content;
  const text = [
    `💬 新评论 · ${flag}`,
    `页面：${c.pageId}`,
    `昵称：${c.nick}`,
    "",
    preview,
    "",
    `管理：${env.SITE_ORIGIN}/api/comments/admin?token=${env.ADMIN_TOKEN}`,
  ].join("\n");

  try {
    await fetch(
      `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TG_CHAT_ID,
          text,
          disable_web_page_preview: true,
        }),
      },
    );
  } catch {
    // 通知失败不影响评论本身，静默吞掉。
  }
}

// ─────────────────────────────── 工具 ───────────────────────────────

interface CommentRow {
  id: number;
  parent_id: number | null;
  nick: string;
  content: string;
  created_at: string;
}

/** 概览的按页聚合行。count / last_at 是 SQL 里的别名，不是表字段。 */
interface OverviewPageRow {
  page_id: string;
  count: number;
  last_at: string;
}

/** 概览的跨页时间流行。比 CommentRow 多了 page_id（要标出来自哪篇文档），少了 parent_id（概览不展示嵌套）。 */
interface OverviewItemRow {
  id: number;
  page_id: string;
  nick: string;
  content: string;
  created_at: string;
}

function toItem(row: CommentRow) {
  return {
    id: row.id,
    parent: row.parent_id,
    nick: row.nick,
    content: row.content,
    createdAt: row.created_at,
  };
}

/**
 * 读总开关。**读不到就按 on 处理** —— 这样已经部署的 D1 库不需要任何迁移，
 * schema.sql 里那条 INSERT OR IGNORE 只对全新初始化生效。
 * 同理，值是任何意外内容时也按 on：故障时宁可留言还开着，也不要莫名其妙全站消失。
 */
async function getEnabled(env: Env): Promise<Enabled> {
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'enabled'",
  ).first<{ value: string }>();
  return row?.value === "off" ? "off" : "on";
}

async function getModeration(env: Env): Promise<Moderation> {
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'moderation'",
  ).first<{ value: string }>();
  const v = row?.value;
  return v === "review" || v === "first" ? v : "open";
}

/** 列表缓存键。只保留 page 参数，避免无关查询串制造缓存碎片。 */
function listCacheKey(requestUrl: string, pageId: string): Request {
  const u = new URL(requestUrl);
  u.pathname = "/api/comments";
  u.search = `?page=${encodeURIComponent(pageId)}`;
  return new Request(u.toString(), { method: "GET" });
}

/**
 * 概览缓存键。概览无参数，键就是固定路径 —— 显式覆写 pathname 与清空 search，
 * 是为了让发表接口（其 request.url 是 /api/comments）也能算出同一个键来删缓存。
 */
function overviewCacheKey(requestUrl: string): Request {
  const u = new URL(requestUrl);
  u.pathname = "/api/comments/overview";
  u.search = "";
  return new Request(u.toString(), { method: "GET" });
}

/**
 * 内容变更后清缓存。任何改动评论可见性的操作都必须调它，否则改动要等最多 60 秒才生效。
 *
 * 概览缓存**每次都清**：它是全站聚合，任意一页的变动都会改变它的内容。
 * 两处缓存必须一起清，否则文档页与概览页会给出互相矛盾的画面。
 */
async function purgeCaches(
  requestUrl: string,
  pageIds: string[],
): Promise<void> {
  await Promise.all([
    ...pageIds.map((p) => caches.default.delete(listCacheKey(requestUrl, p))),
    caches.default.delete(overviewCacheKey(requestUrl)),
  ]);
}

/**
 * 页面标识规范化。必须以 / 开头、长度受限、不含控制字符与引号 ——
 * 否则任意字符串都能灌进 page_id，制造无限多的「页面」把表撑爆。
 */
function normalizePageId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s.startsWith("/") || s.length > 200) return null;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: 正是要拦控制字符
  if (/[\x00-\x1f\x7f"'<>\\]/.test(s)) return null;
  return s;
}

/** 清洗用户输入：去控制字符，折叠过量空行；多行文本保留换行，单行文本压成一行。 */
function cleanText(raw: unknown, multiline: boolean): string | null {
  if (typeof raw !== "string") return null;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: 正是要清控制字符
  // 保留 \t (\x09) 与 \n (\x0a)，其余 C0 控制字符（含 \r）一律剔除
  let s = raw.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
  s = multiline ? s.replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  s = s.trim();
  return s === "" ? null : s;
}

/** 按码点计数。用 .length 会把 emoji 和部分汉字算成两个字符。 */
function charLength(s: string): number {
  return [...s].length;
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${salt}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/** 常数时间比较。长度差异会提前返回，但 token 长度本身不是秘密。 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function readJson(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const data = await request.json();
    return data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = [
    env.SITE_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  return {
    "access-control-allow-origin":
      origin && allowed.includes(origin) ? origin : env.SITE_ORIGIN,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function withHeaders(res: Response, extra: Record<string, string>): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

function json(
  data: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * 留言已关闭时两个读接口的统一响应。
 *
 * 字段形状与正常响应保持一致（items / pages / total 都在，只是空的），前端不必为
 * 关闭状态写另一套解析；`closed: true` 才是它据以整块收起评论区的依据。
 *
 * **刻意不缓存**：关闭态入了缓存，重新打开后就要再清一次才能恢复，一来一回都得记着。
 * 不缓存的代价只是关闭期间每次请求多读一行 settings —— 而关闭期间本就没什么流量。
 */
function closedResponse(cors: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ items: [], pages: [], total: 0, closed: true }),
    {
      status: 200,
      headers: {
        ...cors,
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

/** 用户可见的失败。status 字段供前端决定提示文案，message 直接展示。 */
function fail(
  status: "invalid" | "rate_limited" | "closed",
  message: string,
  cors: Record<string, string>,
): Response {
  return json({ ok: false, status, message }, 200, cors);
}

function methodNotAllowed(
  cors: Record<string, string>,
  allow: string,
): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { ...cors, Allow: allow },
  });
}
