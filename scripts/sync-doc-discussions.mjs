#!/usr/bin/env node
/**
 * 为每篇文档在 Flarum 里建一个承载评论的主题，并把「文档路径 → 主题 id」写进
 * data/doc-discussions.json。文档页的评论区靠这张表定位自己该读写哪个主题。
 *
 * 为什么需要这张表：Flarum 没有「按外部标识查主题」的接口。用 filter[q] 搜标题
 * 是全文检索，对 "/docs/guides/cli" 这种带斜杠连字符的串会被分词打散，既不精确
 * 也不稳定。构建期一次性建好映射，之后就是纯查表。
 *
 * 幂等：已经在映射里的文档直接跳过，不会重复建主题。所以可以随时重跑，
 * 新增文档时补建即可。
 *
 * 用法：
 *   FLARUM_API_KEY=<key> node scripts/sync-doc-discussions.mjs
 *   FLARUM_API_KEY=<key> node scripts/sync-doc-discussions.mjs --dry-run
 *
 * API key 在服务器的 /opt/flarum/SYNC_API_KEY 里（600）。用 master key 而不是
 * 登录得到的 access token —— 后者随会话过期，CI 里每次都得重新登录并保存管理员密码。
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DOCS_DIR = join(ROOT, "content", "docs");
const OUT_FILE = join(ROOT, "data", "doc-discussions.json");

const BASE = process.env.FLARUM_API_URL ?? "https://forum.windinput.com";
const KEY = process.env.FLARUM_API_KEY ?? "";
/** 「文档反馈」板块。与 src/lib/flarum.ts 的 DOCS_TAG_ID 必须一致。 */
const DOCS_TAG_ID = Number(process.env.FLARUM_DOCS_TAG_ID ?? 14);
const DRY = process.argv.includes("--dry-run");

/** 递归收集 .mdx。不用 glob 是为了零依赖 —— 这脚本可能在 CI 的干净环境里跑。 */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

/**
 * 文件路径 → fumadocs 的 page.url。
 *
 * 这个映射必须与 docs/[[...slug]]/page.tsx 传给评论区的 page.url 完全一致，
 * 错一个字符就是「评论发到了另一篇文档」或「读不到任何评论」。规则：
 *   content/docs/guides/cli.mdx          → /docs/guides/cli
 *   content/docs/guides/config/index.mdx → /docs/guides/config
 *   content/docs/index.mdx               → /docs
 */
function toUrl(file) {
  const rel = relative(DOCS_DIR, file)
    .split(sep)
    .join("/")
    .replace(/\.mdx$/, "");
  const trimmed = rel === "index" ? "" : rel.replace(/\/index$/, "");
  return trimmed ? `/docs/${trimmed}` : "/docs";
}

/**
 * 取 frontmatter 的 title。只用正则不引 gray-matter：这里只需要一个字段，
 * 而 frontmatter 的第一块 --- 之间必然是 YAML，title 又总是单行标量。
 */
function titleOf(file, url) {
  const src = readFileSync(file, "utf8");
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    const m = fm[1].match(/^title:\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return url; // 没有 title 就退回用路径，至少能区分
}

async function flarum(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      // userId=1 是必需的：master key 本身不绑定用户，Flarum 靠这个参数
      // 决定以谁的身份执行。缺了它会被当作匿名请求而拒绝。
      Authorization: `Token ${KEY}; userId=1`,
      ...(init.headers ?? {}),
    },
  });
  return res;
}

async function createDiscussion(url, title) {
  const body = {
    data: {
      type: "discussions",
      attributes: {
        title: `文档评论：${title}`,
        // 首帖是说明楼，评论区会跳过 number===1 不予展示。
        // 它的作用是让论坛里直接看到这个主题时知道来龙去脉。
        content: `本主题承载文档页 [${url}](https://windinput.com${url}) 的评论。\n\n在文档页底部发表的评论会出现在这里，两边是同一份内容。`,
      },
      relationships: {
        tags: { data: [{ type: "tags", id: String(DOCS_TAG_ID) }] },
      },
    },
  };
  const res = await flarum("/api/discussions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const doc = await res.json();
  return Number(doc.data.id);
}

async function main() {
  if (!existsSync(DOCS_DIR)) {
    console.error(`找不到文档目录：${DOCS_DIR}`);
    process.exit(1);
  }
  if (!KEY && !DRY) {
    console.error(
      "缺少 FLARUM_API_KEY。服务器上的 /opt/flarum/SYNC_API_KEY 里有。",
    );
    console.error("只想看会建哪些主题，加 --dry-run。");
    process.exit(1);
  }

  const existing = existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, "utf8"))
    : {};

  const files = walk(DOCS_DIR).sort();
  const pages = files.map((f) => ({ file: f, url: toUrl(f) }));

  // 同一个 url 对应多个文件说明目录结构有歧义（例如同时有 a.mdx 和 a/index.mdx）。
  // 这会让评论落到不确定的主题上，必须在建主题之前就拦下来。
  const seen = new Map();
  for (const p of pages) {
    if (seen.has(p.url)) {
      console.error(`✗ URL 冲突：${p.url}`);
      console.error(`    ${relative(ROOT, seen.get(p.url))}`);
      console.error(`    ${relative(ROOT, p.file)}`);
      process.exit(1);
    }
    seen.set(p.url, p.file);
  }

  const todo = pages.filter((p) => !existing[p.url]);
  console.log(
    `文档 ${pages.length} 篇，已有映射 ${Object.keys(existing).length} 条，待建 ${todo.length} 条`,
  );

  if (DRY) {
    for (const p of todo)
      console.log(`  [dry-run] ${p.url}  ←  ${titleOf(p.file, p.url)}`);
    return;
  }

  let created = 0;
  for (const p of todo) {
    const title = titleOf(p.file, p.url);
    try {
      const id = await createDiscussion(p.url, title);
      existing[p.url] = id;
      created += 1;
      console.log(`  ✓ ${p.url}  →  d/${id}`);
      // 逐条写盘而不是最后统一写：中途失败时已建的主题不会丢映射，
      // 否则重跑会为同一篇文档建出第二个主题。
      writeFileSync(
        OUT_FILE,
        `${JSON.stringify(sortKeys(existing), null, 2)}\n`,
      );
    } catch (e) {
      console.error(`  ✗ ${p.url}  ${e.message}`);
    }
  }

  // 映射里有、但文档已删除的条目保留不动：主题里可能还有评论，
  // 删映射等于让它们变成孤儿。这里只提示。
  const orphans = Object.keys(existing).filter((u) => !seen.has(u));
  if (orphans.length) {
    console.log(
      `\n注意：${orphans.length} 条映射的文档已不存在（主题与评论仍在，未删除）：`,
    );
    for (const u of orphans) console.log(`  ${u}  →  d/${existing[u]}`);
  }

  writeFileSync(OUT_FILE, `${JSON.stringify(sortKeys(existing), null, 2)}\n`);
  console.log(
    `\n本次新建 ${created} 条，映射共 ${Object.keys(existing).length} 条 → ${relative(ROOT, OUT_FILE)}`,
  );
}

/** 按 key 排序输出，让每次生成的 JSON diff 只反映真实变化。 */
function sortKeys(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
