-- 一次性迁移：downloads 主键 version → (version, platform)
--
-- 起因：新增 macOS 构建后，同一版本会有 WindInput-Setup-<ver>.exe 与
-- WindInput-<ver>-macOS.pkg 两个安装包。原表只按 version 做主键，两者的下载
-- 会累加进同一行，既分不清平台，也让「本版本下载量」这个数字失去意义。
--
-- SQLite（D1）无法直接修改主键，只能重建表再灌数据。已有数据全部产生于
-- 只有 Windows 安装版的时期，统一标记为 'windows'。
--
-- 执行顺序（只跑一次）：
--   pnpm db:migrate:remote     ← 本文件
--   pnpm db:init:remote        ← 建 download_events / mirrors
--
-- 重复执行会在第一条语句就失败（downloads_old 已不存在），报错即停，不会破坏
-- 数据——这是刻意不加 IF EXISTS 的原因：宁可报错，也不能让二次执行把刚迁好的
-- 表当成旧表再迁一遍。

ALTER TABLE downloads RENAME TO downloads_old;

CREATE TABLE downloads (
  version    TEXT NOT NULL,
  platform   TEXT NOT NULL DEFAULT 'windows',
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  PRIMARY KEY (version, platform)
);

INSERT INTO downloads (version, platform, count, updated_at)
  SELECT version, 'windows', count, updated_at FROM downloads_old;

DROP TABLE downloads_old;

-- 这两张表是本次改造才引入的、从未上线，若中途跑过一版结构不同的 schema.sql，
-- 直接丢弃由 db:init:remote 重建即可——里面不会有需要保留的数据。
DROP TABLE IF EXISTS download_events;
DROP TABLE IF EXISTS mirrors;
