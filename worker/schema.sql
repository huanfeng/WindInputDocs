-- 下载计数表：一行一个「版本 × 平台」。
-- 计数走单行原子 UPDATE（count = count + 1），并发安全、不丢数。
--
-- 主键必须带 platform：Windows 与 macOS 的同一版本是两个不同的安装包，
-- 只按 version 记会把它们撞进同一行。对外的 /api/stats 仍按版本聚合，
-- 前端展示不受影响。
CREATE TABLE IF NOT EXISTS downloads (
  version    TEXT NOT NULL,
  platform   TEXT NOT NULL DEFAULT 'windows',
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  PRIMARY KEY (version, platform)
);

-- 分渠道计数：同一次下载在 downloads 记总数、在这里记「从哪条线路走的」。
-- 拆两张表而不是给 downloads 加列，是为了让 downloads 保持「权威总量」的单一语义
-- （前端徽章的数据源），这张表纯粹用于评估镜像分流效果。
-- source 取值：'mirror'（国内网盘直链）| 'r2'（Cloudflare R2 公共域）。
CREATE TABLE IF NOT EXISTS download_events (
  version    TEXT NOT NULL,
  platform   TEXT NOT NULL,
  source     TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  PRIMARY KEY (version, platform, source)
);

-- 镜像映射：主键是**完整对象名**，不是版本号。
--
-- 用对象名而非 (版本, 平台) 是刻意的：镜像本质上是「一个文件 ↔ 一个直链」的映射，
-- 与版本/平台的语义无关。这样将来新增任何产物类型（Linux 包、单独的便携版…），
-- 这张表和管理 CLI 都不需要改。
--
-- 「未登记即回落」是安全底线：发版流程里 CI 照常推 R2（下载立刻可用），人工上传
-- 网盘并登记是可选的后置步骤。任何一步没做，用户只是回到纯 R2 体验，而不会遇到
-- 「302 到一个还没上传的文件」。
--
-- url 存的是**无 Range 请求解析到底后的地址**，不是网盘分享入口：入口每多一跳，
-- 客户端 ureq 的 redirects(3) 余量就少一跳（详见 scripts/mirror.mjs）。
-- size 在登记时与 R2 上同名对象比对过，用于挡住「传错版本」这类低级错误。
-- fail_count 由 Cron 探活维护，连续失败达阈值自动置 enabled = 0 回落 R2。
CREATE TABLE IF NOT EXISTS mirrors (
  key         TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  size        INTEGER NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  fail_count  INTEGER NOT NULL DEFAULT 0,
  last_check  TEXT,
  last_status TEXT,
  updated_at  TEXT
);

-- GitHub Releases 的下载量镜像，由 Cron 每小时同步一次。
--
-- 与自建计数**分表存放**，理由是两侧的写语义根本不同，不是为了归类整齐：
--
--   downloads         每次下载 +1，单行原子递增 —— 增量累加
--   github_downloads  GitHub API 给的是「至今累计」的绝对值 —— 必须整行覆盖
--
-- 混进 downloads 会怎样：那张表的 UPSERT 路径是 `count = count + 1`，把快照喂进去
-- 每小时翻一倍；改成覆盖写，又会把站内的实时计数一并抹掉。两种语义共用一张表，
-- 无论选哪条更新路径，都有一半的数据是错的。
--
-- version / platform 的取值口径与 downloads 完全一致 —— 同步时用同一个
-- parseArtifact() 解析 GitHub 的**资产文件名**（不是 tag）。资产名与 R2 上的对象名
-- 同源于主仓 CI（都是 WindInput-Setup-<版本>.exe 这一套），两侧天然对齐，不需要
-- 任何版本号归一化，也不必处理 tag 上的 `v` 前缀。
--
-- 同步只 UPSERT 抓到的行，从不 DELETE：API 半路失败最多让数据陈旧，不会丢数。
CREATE TABLE IF NOT EXISTS github_downloads (
  version    TEXT NOT NULL,
  platform   TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  PRIMARY KEY (version, platform)
);
