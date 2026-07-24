-- 下载计数表：一行一个版本。
-- 计数走单行原子 UPDATE（count = count + 1），并发安全、不丢数。
-- 总下载量 = SUM(count)，当前版本下载量 = 对应行的 count。
CREATE TABLE IF NOT EXISTS downloads (
  version    TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);
