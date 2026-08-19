// 版本 → 文档的反查索引：把散落在文档里的 `<Since>` 徽章收集起来，按版本归拢。
//
// 更新记录（data/releases.json）只有一句「增加词语联想功能」，读者看完仍不知道去哪配。
// 而文档里早就逐条标了「自 0.117 起可用」——这份对应关系一直存在，只是没被反查出来。
// 本模块在构建期扫一遍 MDX 源码，让更新记录能直接列出「本版相关配置」的深链。
//
// **仅限服务端**：用了 node:fs，只能被 server component 引用（changelog 页静态导出，
// 扫描发生在 next build 期间，产物里不含任何扫描逻辑）。
//
// 不落地成 data/*.json 生成物，是为了避开「生成物要不要入库 / 会不会忘记重跑」——
// 构建期本就能读到源码，多一份中间文件只会多一处漂移。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isUnreleased, minorOf } from "./releases";
import { source } from "./source";

export interface SinceEntry {
  /** 展示名：小节标题，或整页新增时的页面标题 */
  title: string;
  /** 深链，小节级带锚点 */
  url: string;
  /** page = 整页都是新功能；section = 页内某一节 */
  scope: "page" | "section";
}

const SINCE_RE = /<Since\s+v="([\d.]+)"\s*\/>/;
const HEADING_RE = /^(#{2,6})\s+(.+)$/;
const ANCHOR_RE = /\[#([^\]]+)\]\s*$/;

/** 遮蔽围栏代码块与行内代码，避免文档里演示 `<Since>` 写法的示例被当成真标注收录。
 *
 * 用等长空格替换而非删除，保住行结构——扫描按行进行，行错位会让锚点配到隔壁标题。
 * 遮蔽结果只用于**判定**某行算不算标注，标题文字仍从原文取：行内代码是标题的一部分
 * （`### 纯词列表（.txt，一行一个词）`），照着遮蔽结果取会得到一串空格。 */
function maskCode(text: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, " ");
  return text
    .replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\2[ \t]*$/gm, blank)
    .replace(/(`+)(?:[^`\n]|(?!\1)`)+\1/g, blank);
}

/** 剥掉标题里的行内标记，留下可读文字。 */
function cleanTitle(text: string): string {
  return (
    text
      // 全局替换：一个表格行可能两列各带一个徽章
      .replace(/<Since\s+v="[\d.]+"\s*\/>/g, "")
      .replace(/\[#[^\]]*\]\s*$/, "") // 显式锚点声明
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
      .trim()
  );
}

/** 去重键：剥掉标题尾部的配置项后缀，让「联想（input.association）」与「联想」
 * 认成同一件事。只影响去重，展示仍用原标题——后缀本身是有用的定位信息。 */
function dedupeKey(title: string): string {
  return title.replace(/\s*[（([][^）)\]]*[）)\]]\s*$/, "").trim() || title;
}

interface PageScan {
  found: Array<{ version: string; entry: SinceEntry }>;
  /** 未发布的表格行 / 列表项拆出来的纯文本，用于把它们从搜索索引里摘掉。
   *
   * 小节不需要这个——整节被裹进容器后，结构化提取只当它是一个单元，内部正文本来
   * 就进不了索引。表格行与列表项没法裹容器（会破坏表格和列表结构），只打了属性，
   * CSS 能藏住显示，却拦不住索引照常收录单元格文字。 */
  unreleasedTexts: Set<string>;
}

/** 比对用的归一化：抹掉空白与强调标记。
 *
 * 两边的文本来源不同——这边是从 MDX 原文剥出来的，那边是 fumadocs 结构化提取的产物，
 * 两者对标记的处理并不一致：提取那侧保留 `**粗体**` 和反引号、只去掉链接与 JSX，
 * 这边则连强调一起剥掉；剥 `<Since>` 还会在原处留下一个空格。逐条对齐规则太脆，
 * 索性把这些无语义的符号两边一起抹平。比对用的是完整相等而非子串包含，抹得多一些
 * 也不会误伤到别的段落。 */
function normalize(text: string): string {
  return text.replace(/[\s*`_~]/g, "");
}

/** 拆出一行里的可索引文本片段：表格按单元格拆，列表项整条算一段。 */
function fragmentsOf(line: string): string[] {
  if (/^\|/.test(line)) {
    return line
      .split("|")
      .map((cell) => cleanTitle(cell))
      .filter(Boolean);
  }
  const item = /^[-*+]\s+(.*)$/.exec(line);
  if (item) {
    const text = cleanTitle(item[1]);
    return text ? [text] : [];
  }
  return [];
}

/** 扫描一页的 MDX 源码，产出「版本 + 深链」对，以及未发布片段的文本。 */
function scanPage(text: string, url: string, pageTitle: string): PageScan {
  const found: Array<{ version: string; entry: SinceEntry }> = [];
  const unreleasedTexts = new Set<string>();
  const raw = text.split("\n");
  const lines = maskCode(text).split("\n");

  let inFrontmatter = lines[0]?.trim() === "---";
  let beforeFirstHeading = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (inFrontmatter) {
      if (i > 0 && line === "---") inFrontmatter = false;
      continue;
    }

    // 表格行 / 列表项里的未发布标注：正文靠 CSS 藏，索引靠这些文本摘
    const inlineSince = SINCE_RE.exec(line);
    if (inlineSince && isUnreleased(inlineSince[1])) {
      for (const fragment of fragmentsOf(raw[i].trim())) {
        unreleasedTexts.add(normalize(fragment));
      }
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      beforeFirstHeading = false;

      const since = SINCE_RE.exec(heading[2]);
      if (!since) continue;

      // 锚点缺失的标题不收：fumadocs 拿标题文字（含徽章占位）生成 id，会得到
      // 「首选保护-」这类既不可读又随文案漂移的锚点，深链一改标题就碎。
      // scripts/check-mdx.mjs 把这种写法拦在 lint 阶段，此处只是运行时兜底。
      const anchor = ANCHOR_RE.exec(heading[2]);
      if (!anchor) continue;

      // 标题文字取自原文，遮蔽版只负责判定（见 maskCode 的说明）
      const rawHeading = HEADING_RE.exec(raw[i].trim());
      const title = cleanTitle(rawHeading ? rawHeading[2] : heading[2]);
      if (!title) continue;

      found.push({
        version: since[1],
        entry: { title, url: `${url}#${anchor[1]}`, scope: "section" },
      });
      continue;
    }

    // frontmatter 之后、第一个小节标题之前独立成行的 `<Since>`，标的是整页
    // （如「联想」页）。表格与正文行内的 `<Since>` 标的是单个配置项，粒度太细，
    // 列进索引只会把真正的功能条目淹掉，一律不收。
    if (beforeFirstHeading && /^<Since\b/.test(line) && pageTitle) {
      const since = SINCE_RE.exec(line);
      if (since) {
        found.push({
          version: since[1],
          entry: { title: pageTitle, url, scope: "page" },
        });
      }
    }
  }

  return { found, unreleasedTexts };
}

interface Index {
  /** 版本（major.minor）→ 该版本新增功能的文档深链 */
  byVersion: Map<string, SinceEntry[]>;
  /** 页面 url → 该页尚未发布的小节锚点。
   *
   * 正文由 CSS 藏住（见 lib/remark-unreleased.ts），但目录与搜索索引不是正文，
   * 它们是另外生成的数据，藏不到——得拿这份锚点表把条目摘掉。 */
  unreleasedAnchors: Map<string, Set<string>>;
  /** 页面 url → 该页未发布的表格行 / 列表项文本，同样用于摘除搜索索引条目。 */
  unreleasedTexts: Map<string, Set<string>>;
}

function build(): Index {
  const byVersion = new Map<string, SinceEntry[]>();
  const unreleasedAnchors = new Map<string, Set<string>>();
  const unreleasedTexts = new Map<string, Set<string>>();

  for (const page of source.getPages()) {
    const absolutePath =
      page.absolutePath ?? join(process.cwd(), "content/docs", page.path);

    let text: string;
    try {
      text = readFileSync(absolutePath, "utf8");
    } catch {
      continue; // 读不到的页不该拖垮整个构建
    }

    const scan = scanPage(text, page.url, page.data.title ?? "");
    if (scan.unreleasedTexts.size > 0) {
      unreleasedTexts.set(page.url, scan.unreleasedTexts);
    }

    for (const { version, entry } of scan.found) {
      if (isUnreleased(version)) {
        // 未发布的不进版本索引：它对应的版本还没出现在更新记录里，本来也查不到，
        // 这里显式跳过是为了不依赖那个巧合。
        const anchor = entry.url.split("#")[1];
        if (anchor) {
          const set = unreleasedAnchors.get(page.url) ?? new Set<string>();
          set.add(anchor);
          unreleasedAnchors.set(page.url, set);
        }
        continue;
      }
      const bucket = byVersion.get(minorOf(version)) ?? [];
      bucket.push(entry);
      byVersion.set(minorOf(version), bucket);
    }
  }

  // 按标题去重，整页级优先于小节级。三种重复都要挡：
  // - 整页新增时页内小节难免也标着同一版本，「联想」会既指向页面又指向页内小节；
  // - 同一功能在多个页面各写一节（「英文方案的用户词库」在词库页和方案页都有）；
  // - 配置参考页的标题带技术后缀（「联想（input.association）」），与设置页的
  //   「联想」并排列出，读者看到的是同一个词出现两次。
  // 读者要的是一个能点进去的入口，同名时留先扫到的那个（即文档树里靠前的页面）。
  for (const [version, entries] of byVersion) {
    const seen = new Map<string, SinceEntry>();
    for (const entry of entries) {
      const key = dedupeKey(entry.title);
      const prev = seen.get(key);
      if (!prev || (prev.scope === "section" && entry.scope === "page")) {
        seen.set(key, entry);
      }
    }
    byVersion.set(version, [...seen.values()]);
  }

  return { byVersion, unreleasedAnchors, unreleasedTexts };
}

let cache: Index | null = null;

function indexed(): Index {
  cache ??= build();
  return cache;
}

/** 取某版本新增功能的文档链接；该版本没有任何标注时返回空数组。 */
export function getSinceLinks(version: string): SinceEntry[] {
  return indexed().byVersion.get(minorOf(version)) ?? [];
}

/** 取某页尚未发布的小节锚点，供目录与搜索索引摘除对应条目。 */
export function getUnreleasedAnchors(pageUrl: string): ReadonlySet<string> {
  return indexed().unreleasedAnchors.get(pageUrl) ?? EMPTY;
}

/** 该页里是否存在需要摘除的未发布片段——没有就不必逐条比对。 */
export function hasUnreleasedTexts(pageUrl: string): boolean {
  return (indexed().unreleasedTexts.get(pageUrl)?.size ?? 0) > 0;
}

/** 这段文字是不是该页某个未发布的表格行 / 列表项。
 *
 * 归一化规则留在模块内，避免调用方各写一套、日后悄悄走样。 */
export function isUnreleasedText(pageUrl: string, content: string): boolean {
  const texts = indexed().unreleasedTexts.get(pageUrl);
  return texts ? texts.has(normalize(content)) : false;
}

const EMPTY: ReadonlySet<string> = new Set();
