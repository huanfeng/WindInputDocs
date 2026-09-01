#!/usr/bin/env node
/**
 * MDX 静态检查，两项：
 *
 * 1. **裸尖括号占位符**。MDX v3 会先用 JSX 解析器处理正文，`<进程名>` 这类占位符
 *    会被当成开标签，因为找不到配对的闭合标签而在 `next build` 时报错。占位符必须
 *    写进反引号（`` `<进程名>` ``）或代码块里。
 *
 * 2. **带 `<Since>` 的标题必须显式声明锚点**。fumadocs 拿标题文字生成 id，徽章会在
 *    末尾留下空白，`## 首选保护 <Since v="0.113" />` 得到的是 `#首选保护-`——既不可读，
 *    又随文案漂移，站内深链曾因此静默失效。这些标题还是更新记录反查文档的索引来源
 *    （src/lib/since-index.ts），锚点缺失会让该条目整条不被收录。
 *
 * 3. **未发布版本的 `<Since>` 只能标在能整块藏住的位置**。未发布内容由
 *    src/lib/remark-unreleased.ts 在构建期打标记、CSS 藏起来，能藏的单位是小节标题、
 *    表格行、列表项，外加正文开头独立成行的整页标注（整页那档还要连侧栏、站点地图、
 *    搜索、llms.txt 一起摘，见 src/lib/source.ts）。写在普通段落中间的标注藏不掉——
 *    抽掉它会把句子拆散，留着又会把还没发布的功能直接摆给读者。这类只能改写句子，
 *    或挪进列表项。
 *
 * 检查前会把 frontmatter、围栏代码块、行内代码、MDX 注释统一遮蔽成空格，
 * 因此行号与列号保持与原文一致。
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOTS = ["content"];

/** 允许出现的小写内置标签，其余小写标签一律视为占位符。 */
const HTML_TAGS = new Set([
  "a",
  "b",
  "br",
  "code",
  "col",
  "div",
  "em",
  "hr",
  "i",
  "img",
  "input",
  "kbd",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

/** 用同等长度的空格替换，保住行列位置。 */
function blank(text) {
  return text.replace(/[^\n]/g, " ");
}

/** 遮蔽 frontmatter、围栏代码块、行内代码、MDX 注释。 */
function mask(source) {
  let text = source;

  // frontmatter：仅限文件开头
  text = text.replace(/^---\n[\s\S]*?\n---/, blank);

  // MDX 注释 {/* ... */}
  text = text.replace(/\{\/\*[\s\S]*?\*\/\}/g, blank);

  // 围栏代码块：``` 或 ~~~，闭合围栏不短于开启围栏
  text = text.replace(
    /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\2[ \t]*$/gm,
    blank,
  );

  // 行内代码：反引号串数量需配对，且不跨行
  text = text.replace(/(`+)(?:[^`\n]|(?!\1)`)+\1/g, blank);

  return text;
}

/** 判断 `<...>` 中的内容是否为合法标签。 */
function isValidTag(inner) {
  const body = inner.startsWith("/") ? inner.slice(1) : inner;
  const name = body.split(/[\s/]/, 1)[0];
  if (!name) return true; // `</>` 片段语法

  // 自动链接：<https://…> 或 <foo@bar.com>
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(name) || /^[^\s@]+@[^\s@]+$/.test(name)) {
    return true;
  }

  if (!/^[A-Za-z][A-Za-z0-9.]*$/.test(name)) return false;
  if (/^[A-Z]/.test(name)) return true; // 组件
  return HTML_TAGS.has(name);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && entry.name.endsWith(".mdx")) yield full;
  }
}

const problems = [];
const sinceProblems = [];
const unreleasedProblems = [];

const HEADING_RE = /^#{1,6}\s+(.+)$/;
const SINCE_RE = /<Since\s+v="[^"]*"\s*\/>/;
const SINCE_VERSION_RE = /<Since\s+v="([\d.]+)"\s*\/>/g;
/** 整页标注：正文开头独占一行的 `<Since>`，见 src/lib/unreleased.ts 的 pageSinceVersion。 */
const PAGE_SINCE_RE = /^<Since\s+v="[\d.]+"\s*\/>$/;
/** 行尾的显式锚点声明，如 `[#top-protect]`。 */
const ANCHOR_RE = /\[#[^\]]+\]\s*$/;
/** 能被整块藏住的位置：表格行、列表项（标题另行判断）。 */
const TABLE_ROW_RE = /^\|/;
const LIST_ITEM_RE = /^[-*+]\s/;

/** 已发布的最新版本，取自更新记录——与站点判定未发布内容用的是同一个数据源。 */
const currentVersion = JSON.parse(
  readFileSync(join("data", "releases.json"), "utf8"),
)[0].version;

function minorPair(version) {
  const m = /^(\d+)\.(\d+)/.exec(version);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

function isUnreleased(version) {
  const [major, minor] = minorPair(version);
  const [curMajor, curMinor] = minorPair(currentVersion);
  return major > curMajor || (major === curMajor && minor > curMinor);
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    const masked = mask(source);
    const lines = source.split("\n");
    // 第一个标题之前是「整页」的地盘，往下才是各小节自己的
    let beforeFirstHeading = true;

    masked.split("\n").forEach((line, index) => {
      const trimmed = line.trim();
      const heading = HEADING_RE.exec(trimmed);
      if (heading && SINCE_RE.test(heading[1]) && !ANCHOR_RE.test(heading[1])) {
        sinceProblems.push({
          file: relative(process.cwd(), file).split(sep).join("/"),
          line: index + 1,
          text: lines[index].trim(),
        });
      }

      // 未发布标注只有落在能整块藏住的位置才不会泄露
      const hideable =
        heading ||
        (beforeFirstHeading && PAGE_SINCE_RE.test(trimmed)) ||
        TABLE_ROW_RE.test(trimmed) ||
        LIST_ITEM_RE.test(trimmed);
      if (heading) beforeFirstHeading = false;
      if (!hideable) {
        SINCE_VERSION_RE.lastIndex = 0;
        for (const m of trimmed.matchAll(SINCE_VERSION_RE)) {
          if (!isUnreleased(m[1])) continue;
          unreleasedProblems.push({
            file: relative(process.cwd(), file).split(sep).join("/"),
            line: index + 1,
            version: m[1],
            text: lines[index].trim(),
          });
        }
      }

      for (const match of line.matchAll(/<([^<>\n]{1,80})>/g)) {
        if (isValidTag(match[1])) continue;
        problems.push({
          file: relative(process.cwd(), file).split(sep).join("/"),
          line: index + 1,
          column: match.index + 1,
          tag: `<${match[1]}>`,
          text: lines[index].trim(),
        });
      }
    });
  }
}

if (
  problems.length === 0 &&
  sinceProblems.length === 0 &&
  unreleasedProblems.length === 0
) {
  console.log(
    `MDX 检查通过：无裸尖括号占位符，带 Since 的标题锚点齐备，` +
      `未发布标注（> v${currentVersion}）都在能藏住的位置。`,
  );
  process.exit(0);
}

for (const p of problems) {
  console.error(`${p.file}:${p.line}:${p.column}  裸尖括号 ${p.tag}`);
  console.error(`  ${p.text}`);
}
if (problems.length > 0) {
  console.error(
    `\n共 ${problems.length} 处裸尖括号。MDX 会把 ${problems[0].tag} 当成 JSX 开标签，` +
      `因找不到闭合标签导致 next build 失败。\n` +
      `请把占位符包进反引号，例如 \`${problems[0].tag}\`，或放进代码块。\n`,
  );
}

for (const p of sinceProblems) {
  console.error(`${p.file}:${p.line}  带 <Since> 的标题缺少显式锚点`);
  console.error(`  ${p.text}`);
}
if (sinceProblems.length > 0) {
  console.error(
    `\n共 ${sinceProblems.length} 处。自动生成的 id 会带上徽章留下的尾部连字符` +
      `（\`#首选保护-\`），既不可读又随标题文案漂移，也不会被更新记录的版本索引收录。\n` +
      `请在标题行尾补显式锚点，例如 \`## 首选保护 <Since v="0.113" /> [#top-protect]\`。`,
  );
}

for (const p of unreleasedProblems) {
  console.error(
    `${p.file}:${p.line}  未发布版本 v${p.version} 的标注写在了藏不住的位置`,
  );
  console.error(`  ${p.text}`);
}
if (unreleasedProblems.length > 0) {
  console.error(
    `\n共 ${unreleasedProblems.length} 处。已发布的最新版本是 v${currentVersion}，` +
      `更高版本的内容会被构建期标记 + CSS 藏起来，但能藏的单位是**小节标题、表格行、\n` +
      `列表项，以及正文开头独占一行的整页标注**——段落中间的标注抽掉会把句子拆散，\n` +
      `只能原样显示，等于把还没发布的功能直接摆给读者。\n` +
      `请改写句子把它拆出来，或挪进列表项 / 单独小节；整页都是新功能则标在正文开头。`,
  );
}
process.exit(1);
