-- 文档站评论库。与下载计数库（windinput-downloads）刻意分开：
-- 评论是用户生成内容，读写模式、风险等级、重建代价都与下载计数不同。
-- 万一评论表被刷需要清空重建，不应牵连下载数据。

-- 评论正文表。
--   content 只存纯文本，展示端不解析 HTML / Markdown —— 直接消灭 XSS 攻击面。
--   不存明文 IP、不收邮箱：限流与封禁用加盐哈希即可，少收一样数据少一分合规负担。
CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id    TEXT    NOT NULL,           -- 页面标识，取 fumadocs 的 page.url，如 /docs/start/concepts
  parent_id  INTEGER,                    -- 回复目标；顶层为 NULL。只允许一层嵌套
  nick       TEXT    NOT NULL,
  content    TEXT    NOT NULL,
  status     INTEGER NOT NULL DEFAULT 1, -- 0=待审 1=公开 2=已删/垃圾
  ip_hash    TEXT,                       -- SHA-256(IP + IP_SALT) 前 32 位十六进制
  ua         TEXT,
  created_at TEXT    NOT NULL
);

-- 列表查询：按页取公开评论，按 id 升序（= 时间序，AUTOINCREMENT 保证单调）。
CREATE INDEX IF NOT EXISTS idx_comments_page ON comments(page_id, status, id);
-- 限流查询：按 ip_hash 数最近 N 秒 / N 小时的提交数。
CREATE INDEX IF NOT EXISTS idx_comments_ip ON comments(ip_hash, created_at);
-- 待审队列：管理端按 status 倒序拉取。
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status, id);

-- 运行时配置。刻意存库而不是存环境变量：
-- 改环境变量要重新部署，意味着必须在装了 wrangler 的电脑前。而需要切审核策略的场景
-- 恰恰是「垃圾评论突然爆发、人不在电脑前」—— 存库才能用手机点一下就切。
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- moderation 取值：
--   open   直接公开（默认）。仅被反垃圾规则判定可疑的转待审。
--   review 全部先审后发。
--   first  首评先审，同 ip_hash 有通过记录后自动放行。
INSERT OR IGNORE INTO settings (key, value) VALUES ('moderation', 'open');

-- enabled 取值 on / off。off 时三个公开接口一律回空，文档页与留言页整个评论区消失，
-- 发表也被拒——但**管理页不受影响**，仍能看到并清理全部内容。这正是关闭功能的主场景：
-- 被刷爆时先一键藏起来止血，再慢慢清理；若关闭连管理端也看不到，就把自己锁在门外了。
--
-- 数据不动，重新打开即原样恢复。
-- 代码里读不到这个 key 时默认按 on 处理，所以已部署的库无需迁移。
INSERT OR IGNORE INTO settings (key, value) VALUES ('enabled', 'on');

-- 留言板（page_id = '/board'）的审核策略，取值同 moderation，但**独立配置**。
-- 分开是因为两处的风险不同：文档页评论多半针对具体内容，留言板不挂钩任何文档、
-- 更容易成为广告的落点，通常需要比文档页更严的策略。
--
-- 留言板本身不是新表：它只是一个不对应任何文档的保留 page_id，因此限流、封禁、
-- 蜜罐、缓存、管理页操作全部原样复用，没有一处特例。
INSERT OR IGNORE INTO settings (key, value) VALUES ('board_moderation', 'open');

-- 封禁名单。只封哈希，封的是「同一来源」而不是「某个人」。
CREATE TABLE IF NOT EXISTS bans (
  ip_hash    TEXT PRIMARY KEY,
  reason     TEXT,
  created_at TEXT NOT NULL
);
