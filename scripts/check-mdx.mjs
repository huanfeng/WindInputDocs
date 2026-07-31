#!/usr/bin/env node
/**
 * 检查 MDX 中的裸尖括号占位符。
 *
 * MDX v3 会先用 JSX 解析器处理正文，`<进程名>` 这类占位符会被当成开标签，
 * 因为找不到配对的闭合标签而在 `next build` 时报错。占位符必须写进反引号
 * （`` `<进程名>` ``）或代码块里。
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

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    const masked = mask(source);
    const lines = source.split("\n");

    masked.split("\n").forEach((line, index) => {
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

if (problems.length === 0) {
  console.log("MDX 检查通过：未发现裸尖括号占位符。");
  process.exit(0);
}

for (const p of problems) {
  console.error(`${p.file}:${p.line}:${p.column}  裸尖括号 ${p.tag}`);
  console.error(`  ${p.text}`);
}
console.error(
  `\n共 ${problems.length} 处。MDX 会把 ${problems[0].tag} 当成 JSX 开标签，` +
    `因找不到闭合标签导致 next build 失败。\n` +
    `请把占位符包进反引号，例如 \`${problems[0].tag}\`，或放进代码块。`,
);
process.exit(1);
