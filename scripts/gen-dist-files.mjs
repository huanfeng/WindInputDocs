#!/usr/bin/env node
/**
 * 构建后产出「分发文件」：在线更新元信息与各版本发布说明。
 *
 * 这些文件从前在 R2 上，由主仓 CI 随安装包一起推。挪进文档站产物是因为它们
 * **只有几百字节到几 KB，却让 R2 变成了在线更新的必经之路**——R2 在部分区域
 * 完全不可达时，用户不是「更新慢」而是「永远收不到新版本」。R2 现在只留安装包
 * 本体（那才是非放对象存储不可的东西）。
 *
 * 对外 URL 一律不变，仍是 dl.windinput.com/latest.json 与
 * dl.windinput.com/WindInput-<版本>-Release.md —— 老客户端里这些地址是硬编码的，
 * 换域名等于把存量用户的在线更新一次性切断。改由 EdgeOne 把这两类路径重写到
 * 文档站产物（见 edgeone.json 的 rewrites）。
 *
 * 写进 out/ 而不是 public/：这些是**分发产物**，不是站点源文件。public/ 下的东西
 * 会进 git，而它们每次构建都由 data/ 重新生成，进版本库只会制造无意义的 diff。
 *
 * 在 package.json 的 build 里显式串联执行，不用 postbuild —— pnpm 的
 * enable-pre-post-scripts 默认值在几个大版本间反复过，依赖它等于把构建的完整性
 * 押在包管理器的一个默认项上。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, "data");
const OUT = join(ROOT, "out");

function readJson(name) {
  return JSON.parse(readFileSync(join(DATA, name), "utf8"));
}

/**
 * notes 数组 → 发布说明 Markdown。
 *
 * notes 里标题行保留着 `#` 前缀（sync_release_notes.py 的约定，前端据此分组），
 * 其余是纯文本条目 —— 行内标记在同步时已被剥掉，所以这里重建出的正文与主仓
 * Release body 相比会少掉反引号一类的行内格式。这是刻意接受的损失：
 * `releaseNotesUrl` 永远指向最新版，历史版本的 .md 实际无人访问，为了那点格式
 * 另存一份原文副本不值得。
 */
function toMarkdown(entry) {
  const lines = [`# WindInput ${entry.version}`, ""];
  if (entry.date) lines.push(`发布日期：${entry.date}`, "");

  for (const note of entry.notes ?? []) {
    if (note.startsWith("#")) {
      lines.push("", note, "");
    } else {
      lines.push(`- ${note}`);
    }
  }

  // 合并空行：小节标题前后各补了一个空行，相邻标题之间会撞出连续空行
  return `${lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

function main() {
  mkdirSync(OUT, { recursive: true });

  // latest.json：由 sync_release_notes.py 从 GitHub Release 组装，这里只是搬运。
  // 缺文件时直接失败 —— 静默跳过会产出一份「站点正常、在线更新静默失效」的构建，
  // 那种故障要等用户报「收不到更新」才会被发现。
  const latest = readJson("latest.json");
  writeFileSync(
    join(OUT, "latest.json"),
    `${JSON.stringify(latest, null, 2)}\n`,
  );

  // 全版本都生成：EdgeOne 的重写规则是 WindInput-*-Release.md 一条通配，
  // 只产出最新版会让历史地址 404。每份几 KB，全量也不过几十 KB。
  const releases = readJson("releases.json");
  for (const entry of releases) {
    writeFileSync(
      join(OUT, `WindInput-${entry.version}-Release.md`),
      toMarkdown(entry),
    );
  }

  console.log(
    `分发文件已生成：latest.json（v${latest.version}）+ ${releases.length} 份发布说明`,
  );
}

main();
