# 评论 Worker（windinput-comments）

给文档站提供**评论功能**。数据落 Cloudflare D1，反垃圾全在服务端完成。

- `GET /api/comments?page=<pageId>` —— 取该页公开评论，带 60 秒边缘缓存。
- `POST /api/comments` —— 发表评论。
- `GET /api/comments/overview` —— 全站概览：哪些页有评论 + 最近 50 条，同样带 60 秒缓存。
- `GET /api/comments/admin?token=…` —— 极简管理页（HTML），**手机浏览器直接可操作**。
- `POST /api/comments/admin` —— 放行 / 删除 / 恢复 / 封禁 / 切换审核策略 / 开关留言。

## 全站概览（`/api/comments/overview`）

文档站有四十多篇文档，评论散在各页里，不逐页翻就不知道哪儿有讨论。这个接口是站点「留言」页（`/comments`）与管理页「按文档」区共同的数据源：

```jsonc
{
  "pages": [ { "page": "/docs/start/concepts", "count": 7, "lastAt": "…" } ], // 按最后评论时间倒序
  "items": [ { "id": 128, "page": "/docs/…", "nick": "…", "content": "…", "createdAt": "…" } ],
  "total": 128
}
```

一次返回两份数据而不是拆成两个接口：前端两个视图都要，拆开就是两次往返、两份缓存各自失效。`pages` 的行数等于「有评论的页面数」，最多几十行。

**Worker 不存文档标题**，`page_id` 就是 URL。标题由前端在构建期用 fumadocs 的 `source.getPages()` 解析（见 `src/app/(home)/comments/page.tsx`）—— 改文档标题时留言页自动跟上，Worker 侧不必冗余存一份会过期的副本。映射里查不到的 `page_id` 就是**孤儿留言**（文档被删或改了路径），留言页会单独标出来，这是发现漏迁的唯一途径。

新增子路径**无需改动 `wrangler.jsonc` 的路由** —— `windinput.com/api/comments*` 是通配的，天然覆盖 `/overview`，也不会靠近 `/api/search`。

### 缓存失效

任何改变评论可见性的操作都必须调 `purgeCaches()`，它同时清「该页列表」与「全站概览」两份缓存：

| 操作 | 清哪些页 |
|---|---|
| 发表（直接公开时） | 该页 |
| 管理页放行 / 删除 | 该条所属页（先查 `page_id` 再更新） |
| 封禁来源 | 该来源评论涉及的全部页（**下架前**先查 `DISTINCT page_id`，更新后就查不到了） |

概览缓存每次都清 —— 它是全站聚合，任意一页的变动都会改变它。两份缓存必须一起清，否则文档页与留言页会给出互相矛盾的画面。

## 为什么是独立的 Worker

与下载网关（`../worker`，`windinput-dl`）刻意分开部署：

- **故障隔离**。下载网关是关键路径（用户下载软件、客户端在线更新都走它），评论是锦上添花。混在一起，评论的 bug 或被刷会拖累下载。
- **迭代节奏不同**。下载网关已收敛，评论第一期必然反复改。
- 新建 Worker 与 D1 在 Cloudflare 上成本为 0。

D1 也用独立库（`windinput-comments`）：评论是用户生成内容，万一被刷需要清空重建，不应牵连下载计数。

## 同源部署（关键设计）

评论 API 以**窄路由**叠加在文档站（Cloudflare Pages 项目 `windinput-docs`）之上：

```
windinput.com/api/comments*  ─► 本 Worker      ← 匹配则归 Worker
windinput.com/其它一切        ─► Pages 静态站    ← 未匹配落到 Pages
```

Worker 路由优先级高于 Pages，机制与下载网关叠加在 R2 自定义域上完全一致。

同源带来两个实在好处：前端 `fetch` **无跨域、无预检**；可达性与站点**完全一致**（同一个 DNS 名、同一条链路），而不只是「差不多」。

### ⚠️ 路由必须精确到 `/api/comments*`

**绝不能写成 `/api/*`。** 文档站的搜索索引由 `src/app/api/search/route.ts`（fumadocs `staticGET`）静态导出，产物落在 `out/api/search/` 下。写宽会把搜索请求一并劫持，**全站搜索直接失效**。

部署后务必回归验证 `/api/search`，见下方验证清单。

## 反垃圾设计

**刻意不接验证码。** Cloudflare Turnstile 的 `challenges.cloudflare.com` 在大陆访问很慢，接它等于给站点引入一个比自身更差的可达点——恰好违背了选型时立的判据。所以全部规则在服务端完成，用户**零感知、零额外请求**：

| 手段 | 行为 |
|---|---|
| 蜜罐字段 `hp` | 真人看不见，只有自动填表的机器人会填。命中即**伪装成功但不入库** |
| 填写耗时 `elapsed` | < 3 秒判机器人（同样伪装成功）；> 6 小时判陈旧表单，提示刷新 |
| IP 限流 | 同来源 60 秒 ≤ 1 条、24 小时 ≤ 10 条 |
| 内容规则 | 昵称 ≤ 20 字，正文 2–1000 字；含 URL ≥ 2 条 → **转待审而非拒绝** |
| 封禁名单 | 按 `ip_hash` 拉黑，并连坐下架该来源全部评论 |

对机器人一律返回**伪装的成功**，不给「被识破」的反馈信号，否则它会换策略重试。

### 隐私

**不收邮箱，不存明文 IP。** 限流与封禁只用 `SHA-256(IP + IP_SALT)` 的前 32 位。正文只存纯文本，展示端不解析 HTML / Markdown，XSS 攻击面归零。

## 通用留言板

除文档页评论外，还有一个不挂钩任何文档的**留言板**，挂在站点的 `/comments` 页面上（默认标签页）。

它**不是另一张表**，而是一个保留的 `page_id`：`/board`。因此限流、封禁、蜜罐、边缘缓存、管理页的放行/删除/封禁全都原样适用，代码里没有一处特例。站点上不存在 `/board` 这个路由，那个值只是数据标识。

唯一独立的是**审核策略**：留言板走 `settings.board_moderation`，文档页走 `settings.moderation`，两者各切各的。分开是因为风险不同——文档页评论多半针对具体内容，留言板不挂钩任何文档，更容易成为广告落点，通常需要更严的策略。

## 总开关（可整块关闭）

`settings.enabled` 取 `on` / `off`，管理页顶部一键切换。

关闭后：三个公开接口一律回空（带 `closed: true`），文档页与留言页的评论区**整块消失**，发表被拒。数据不动，重新打开即原样恢复。

**管理页不受开关约束**——关停是为了止血后清理，若连管理端也看不到内容，等于把自己锁在门外。

切换会连带清空全部边缘缓存，所以是即时生效而非等 60 秒。关闭态的响应带 `no-store` 不入缓存，重新打开无需再清一次。读不到这个 key 时按 `on` 处理，已部署的库因此不需要迁移。

> 站点侧还有一个**构建期**总开关 `commentsEnabled`（`src/lib/comments.ts`）。两者分工不同：运行时开关是「暂停」，手机点一下即时生效、入口仍在；构建期开关是「下架」，关掉后文档页不渲染评论区、顶栏无入口、`/comments` 变 404，需重新部署才生效。

## 审核策略（可热切换）

策略存在 D1 的 `settings` 表里，**不是环境变量**——改环境变量要重新部署，意味着必须在装了 wrangler 的电脑前。而需要切策略的场景恰恰是「垃圾评论突然爆发、人不在电脑前」。存库才能用手机点一下就切。

| 值 | 行为 |
|---|---|
| `open` | 直接公开（默认）。仅被反垃圾规则判可疑的转待审 |
| `review` | 全部先审后发 |
| `first` | 首评先审，同来源有通过记录后自动放行 |

文档页与留言板各有一份，管理页上是两组独立的按钮。

切换方式二选一：

- 打开管理页 `https://windinput.com/api/comments/admin?token=<ADMIN_TOKEN>`，点按钮。
- 命令行：`pnpm db:mode` 查当前值。

## 首次部署

前置：本机已 `wrangler login`，且拥有目标 Cloudflare 账号的 D1 / Workers 权限。

```bash
cd worker-comments
pnpm install          # 本目录有自己的 pnpm-workspace.yaml，是独立项目，不并入文档站依赖树

# 1) 建 D1 库，把输出的 database_id 填进 wrangler.jsonc
wrangler d1 create windinput-comments

# 2) 建表（远程库）
pnpm db:init:remote

# 3) 先部署，让 Worker 在云端存在
#    顺序很重要：secret put 要求目标 Worker 已存在，否则会反问「要不要新建」。
#    此时代码里的 ADMIN_TOKEN / IP_SALT 还是空的，接口尚不可用，下一步补上即可。
pnpm deploy

# 4) 配置密钥，然后再部署一次让其生效
pnpm exec wrangler secret put ADMIN_TOKEN   # 管理页口令，一串足够长的随机字符
pnpm exec wrangler secret put IP_SALT       # IP 哈希盐，设定后不要再改（改了限流与封禁记录全部失效）
pnpm deploy
```

> 命令用 `pnpm exec wrangler` 而非裸 `wrangler`，确保走本目录锁定的版本，而不是全局可能更旧的那个。

`wrangler.jsonc` 里的路由 `windinput.com/api/comments*` 会在部署时自动创建。

### 验证清单

```bash
# 评论接口通
curl -s "https://windinput.com/api/comments?page=/docs/start/concepts"
# 期望：{"items":[],"total":0}

# 全站概览通
curl -s "https://windinput.com/api/comments/overview"
# 期望：{"pages":[…],"items":[…],"total":N}

# ⚠️ 回归：搜索索引没被路由劫持
curl -sI "https://windinput.com/api/search"
# 期望：200，且 content-type 是 JSON（由 Pages 返回的静态文件）

# 管理页可打开
curl -sI "https://windinput.com/api/comments/admin?token=<ADMIN_TOKEN>"
# 期望：200 text/html；口令错误时应为 404
```

若同源路由因故不可用，退路是把路由改成 `dl.windinput.com/api/comments*`（子域方案，代价是需要跨域，CORS 已在代码中支持），前端 API 基址同步改一处即可。

## Telegram 通知（可选）

Worker 侧调 `api.telegram.org`——这条链路由 Cloudflare 边缘发起，**不受大陆网络限制**。

1. 与 [@BotFather](https://t.me/BotFather) 对话，`/newbot` 创建机器人，拿到 token。
2. 给你的机器人**先发一条任意消息**，然后访问 `https://api.telegram.org/bot<TOKEN>/getUpdates`，从返回里找到 `chat.id`。
3. 写入密钥：

```bash
wrangler secret put TG_BOT_TOKEN
wrangler secret put TG_CHAT_ID
pnpm deploy
```

两个密钥缺任意一个都会静默跳过推送，其余功能不受影响。推送在 `ctx.waitUntil` 中后台执行，失败不影响评论入库。

> 注意：推送消息里带的管理直链**含 ADMIN_TOKEN**，会留在 Telegram 聊天记录中。私聊机器人场景下这是便利性与安全性的有意取舍；若不接受，删掉 `notifyTelegram` 里那一行即可。

## 日常运维

```bash
pnpm db:pending   # 看待审队列
pnpm db:recent    # 看最近 50 条
pnpm db:mode      # 看当前审核策略
```

更常用的是直接打开管理页——放行、删除、封禁、切策略、开关留言都在上面，手机也能操作。

管理页分四块：顶部是**总开关**与两组**审核策略**（文档页 / 留言板），然后是**按文档**概览（页面直链 + 公开数 + 待审数）、**待审**、**最近公开**，最后是默认折叠的**已删除**。

删除是可逆的——只改 `status`，正文一直在库里。展开「已删除」即可找到误删的条目，点「恢复」放回去。

## 本地开发

```bash
cp .dev.vars.example .dev.vars   # 本地密钥，已被 .gitignore 忽略
pnpm db:init:local               # 建本地库表
pnpm dev                         # 起本地 Worker，用本地 D1 模拟，不碰生产数据
```

`wrangler.jsonc` 的 D1 绑定**刻意不设** `"remote": true`，所以本地测试的评论不会写进生产库。

## 免费额度承载力

| 资源 | 免费额度 | 消耗来源 |
|---|---|---|
| Worker 请求 | 10 万 / 天 | 每次文档页访问 1 次（60 秒边缘缓存后实际远低于此） |
| D1 读行 | 500 万 / 天 | 每页读 N 行（N = 该页评论数） |
| D1 写行 | 10 万 / 天 | 每条评论 1 行 |
| D1 存储 | 5 GB | 一条评论约 300 字节 |

离免费线极远。真要撞线只可能是文档站日访问量到十万级，那属于该庆祝的量级。

## 回滚

在 Workers 控制台删除 `windinput.com/api/comments*` 这条路由，评论接口即下线，文档站其余部分完全不受影响（前端组件请求失败会静默降级、不显示评论区）。数据仍在 D1 中，重新加回路由即可恢复。
