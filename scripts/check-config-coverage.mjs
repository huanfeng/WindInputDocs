#!/usr/bin/env node
/**
 * 配置键文档覆盖校验：主仓 `config_schema.rs` 的 `static REGISTRY` 是全部配置键的
 * 单一真相源，本脚本核对每个键是否在 `content/docs/guides/config/*.mdx` 中出现，
 * 防止主仓加了配置项而文档静默漏写（曾审计出 ~7 个键缺口，根因就是没有脚本守门）。
 *
 * 需要主仓在同级目录（`../WindInput`），因此**只能本机跑，不进 CI**——
 * CI 的 checkout 只有文档站仓库，拿不到主仓源码。用法：`pnpm check:config`。
 *
 * 允许清单 `scripts/config-coverage-allowlist.json`：刻意不写文档的键，每条必须带
 * reason。反向检查防清单腐烂：清单里的键若已被文档覆盖、或已不在 REGISTRY，同样报错。
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SCHEMA_RS = resolve(
  import.meta.dirname,
  "../../WindInput/wind_input/crates/wind-config/src/config_schema.rs",
);
const DOCS_DIR = resolve(import.meta.dirname, "../content/docs/guides/config");
const ALLOWLIST_PATH = resolve(
  import.meta.dirname,
  "config-coverage-allowlist.json",
);

// ── 1. 从 REGISTRY 数组段提取全部键名 ──────────────────────────────────────
// 只截取「`static REGISTRY` 声明行 → 数组闭合 `];`」的行区间，避免把测试代码或
// 其他常量里的字符串抓进来。

let schemaSource;
try {
  schemaSource = readFileSync(SCHEMA_RS, "utf8");
} catch {
  console.error(`读不到主仓 schema 文件：${SCHEMA_RS}`);
  console.error(
    "本脚本需要主仓 WindInput 在文档站的同级目录，仅供本机运行，不进 CI。",
  );
  process.exit(2);
}

const lines = schemaSource.split("\n");
const start = lines.findIndex((l) => /^static REGISTRY\b/.test(l));
if (start === -1) {
  console.error(
    "在 config_schema.rs 里找不到 `static REGISTRY` 声明行——主仓可能改了写法，请更新本脚本的提取逻辑。",
  );
  process.exit(2);
}
const end = lines.findIndex((l, i) => i > start && /^\];/.test(l));
if (end === -1) {
  console.error("找不到 REGISTRY 数组的闭合 `];`，提取逻辑失效。");
  process.exit(2);
}

const registryBlock = lines.slice(start, end + 1).join("\n");
// f( 与键名字符串可能因 rustfmt 换行分居两行，\s* 需跨行匹配
const keys = [...registryBlock.matchAll(/\bf\(\s*"([^"]+)"/g)].map((m) => m[1]);

// 提取数量 sanity 检查：主仓改写法后正则可能静默抓空/抓飞，宁可报错也不假绿
if (keys.length < 200 || keys.length > 400) {
  console.error(
    `从 REGISTRY 提取到 ${keys.length} 个键，超出预期区间 [200, 400]——提取疑似失效，请检查主仓写法是否变了。`,
  );
  process.exit(2);
}

const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
if (duplicates.length > 0) {
  console.error(`REGISTRY 中键名重复：${[...new Set(duplicates)].join(", ")}`);
  process.exit(2);
}

// ── 2. 扫文档，判定每个键是否出现 ─────────────────────────────────────────
// 文档的约定是「段落上下文 + 叶子键名」，完整点分路径只偶尔出现在正文里：
//   - 段落上下文来自 toml 代码块的 `[section]` 头，或标题里的 `（ui.candidate）` /
//     `[schema.english]` 标注；续块与表格不重复标段落，沿用最近一次出现的。
//   - toml 块内的赋值行（含 `# key = ...` 注释形式——隐藏键的展示约定）、
//     参考表行首单元格的 `` `key` ``，都与当前段落拼成全路径。
// 兜底：完整点分路径在任意位置出现（反引号或裸文本均算）也算覆盖，
// 两侧不得是键名字符 [\w.]，防止 `a.b` 被 `a.b.c` 的前缀命中。

const mdxFiles = readdirSync(DOCS_DIR)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => join(DOCS_DIR, f));
if (mdxFiles.length === 0) {
  console.error(`在 ${DOCS_DIR} 下找不到任何 .mdx 文件。`);
  process.exit(2);
}
const docsText = mdxFiles.map((f) => readFileSync(f, "utf8")).join("\n");

/** 「段落 + 叶子」拼出的全路径键集合。 */
const contextKeys = new Set();
for (const file of mdxFiles) {
  let section = "";
  let inToml = false;
  let inOtherFence = false;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (inToml) {
      if (/^\s*```/.test(line)) {
        inToml = false;
        continue;
      }
      const sec = /^\s*\[([A-Za-z0-9_.-]+)\]/.exec(line);
      if (sec) {
        section = sec[1];
        continue;
      }
      const kv = /^\s*#?\s*([A-Za-z0-9_.-]+)\s*=/.exec(line);
      if (kv && section) contextKeys.add(`${section}.${kv[1]}`);
      continue;
    }
    if (inOtherFence) {
      if (/^\s*(```|~~~)/.test(line)) inOtherFence = false;
      continue;
    }
    if (/^\s*```toml\b/.test(line)) {
      inToml = true;
      continue;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      inOtherFence = true;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      // 标题里的段落标注：全角括号或方括号（`[#anchor]` 不含点分小写路径，天然排除）
      const m =
        /（([a-z0-9_.]+)）/.exec(line) ?? /\[([a-z0-9_.]+)\]/.exec(line);
      if (m) section = m[1];
      continue;
    }
    const row = /^\|\s*`([A-Za-z0-9_.-]+)`/.exec(line);
    if (row && section) contextKeys.add(`${section}.${row[1]}`);
  }
}

function isDocumented(key) {
  if (contextKeys.has(key)) return true;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`).test(docsText);
}

// ── 3. 允许清单 ────────────────────────────────────────────────────────────

let allowlist = [];
try {
  allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
} catch (e) {
  console.error(`读取允许清单失败（${ALLOWLIST_PATH}）：${e.message}`);
  process.exit(2);
}

const allowlistErrors = [];
const allowedKeys = new Set();
for (const entry of allowlist) {
  if (typeof entry.key !== "string" || typeof entry.reason !== "string") {
    allowlistErrors.push(
      `清单条目缺 key 或 reason 字段：${JSON.stringify(entry)}`,
    );
    continue;
  }
  if (allowedKeys.has(entry.key)) {
    allowlistErrors.push(`清单条目重复：${entry.key}`);
    continue;
  }
  allowedKeys.add(entry.key);
  // 反向检查：清单不许腐烂
  if (!keys.includes(entry.key)) {
    allowlistErrors.push(
      `清单里的键已不在 REGISTRY，请从清单移除：${entry.key}`,
    );
  } else if (isDocumented(entry.key)) {
    allowlistErrors.push(
      `清单里的键其实已被文档覆盖，请从清单移除：${entry.key}`,
    );
  }
}

// ── 4. 汇总输出 ────────────────────────────────────────────────────────────

const missing = keys.filter((k) => !allowedKeys.has(k) && !isDocumented(k));
const documented = keys.length - missing.length - allowedKeys.size;

if (missing.length > 0) {
  const byDomain = new Map();
  for (const key of missing) {
    const domain = key.split(".", 1)[0];
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(key);
  }
  console.error("以下配置键未在 content/docs/guides/config/*.mdx 出现：\n");
  for (const [domain, domainKeys] of byDomain) {
    console.error(`  [${domain}]`);
    for (const key of domainKeys) console.error(`    ${key}`);
  }
  console.error(
    `\n共 ${missing.length} 个键缺失。请在对应的 guides/config/*.mdx 参考表补行` +
      `（默认值以主仓 data/config.toml 实际值为准），或——仅当确属内部键时——` +
      `加进 scripts/config-coverage-allowlist.json 并写明 reason。`,
  );
}

for (const err of allowlistErrors) console.error(`允许清单问题：${err}`);

console.log(
  `\nREGISTRY 共 ${keys.length} 个键：文档覆盖 ${documented}，` +
    `允许清单豁免 ${allowedKeys.size}，缺失 ${missing.length}。`,
);

if (missing.length > 0 || allowlistErrors.length > 0) process.exit(1);
console.log("配置键文档覆盖检查通过。");
