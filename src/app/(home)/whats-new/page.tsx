import { ScrollText, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FeatureLink } from "@/components/since-links";
import { currentVersion, isFirstOfMinor, releases } from "@/lib/releases";
import { areaRank, getSinceLinks, type SinceEntry } from "@/lib/since-index";

export const metadata: Metadata = {
  title: "新功能",
  description: "清风输入法各版本新增的功能，以及它们各自的配置说明",
};

/** 同一版本内按文档分区归拢：一次十几条平铺开，看不出哪些是同一块的设置。 */
function groupByArea(entries: SinceEntry[]): Array<[string, SinceEntry[]]> {
  const groups = new Map<string, SinceEntry[]>();
  for (const entry of entries) {
    const key = entry.area || "其他";
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  // 按导航顺序排，各版本的分组顺序才一致
  return [...groups].sort(([a], [b]) => areaRank(a) - areaRank(b));
}

export default function WhatsNewPage() {
  // 只列有标注的版本。补丁版不单独成组——功能是首发版带来的，否则 0.115.0 与
  // 0.115.1 会各列一遍同样的内容。
  const groups = releases
    .filter((r) => isFirstOfMinor(r.version))
    .map((r) => ({ release: r, entries: getSinceLinks(r.version) }))
    .filter((g) => g.entries.length > 0);

  const total = groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight">新功能</h1>
      <p className="mt-3 text-fd-muted-foreground">
        各版本新增的功能，点进去就是它的配置说明。当前最新版本是{" "}
        <Link
          href="/download"
          className="font-mono text-fd-primary hover:underline"
        >
          v{currentVersion}
        </Link>
        ，共 {total} 项功能有对应文档。
      </p>
      <p className="mt-2 text-sm text-fd-muted-foreground">
        想看完整的更新内容（含优化与问题修复），见{" "}
        <Link href="/changelog" className="text-fd-primary hover:underline">
          更新记录
        </Link>
        。
      </p>

      <div className="mt-10 flex flex-col">
        {groups.map(({ release, entries }) => (
          <section
            key={release.version}
            className="relative border-l pb-10 pl-6 last:pb-0"
          >
            <span
              className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-fd-primary"
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-mono text-xl font-bold">
                v{release.version}
              </h2>
              {release.date && (
                <time className="text-sm text-fd-muted-foreground">
                  {release.date}
                </time>
              )}
              <Link
                href={`/changelog#v${release.version}`}
                className="ms-auto inline-flex items-center gap-1 text-xs text-fd-muted-foreground transition-colors hover:text-fd-primary"
              >
                <ScrollText className="size-3.5" aria-hidden />
                本版更新记录
              </Link>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {groupByArea(entries).map(([area, items]) => (
                <div key={area}>
                  <p className="text-xs font-medium text-fd-muted-foreground">
                    {area}
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-2">
                    {items.map((entry) => (
                      <li key={entry.url}>
                        <FeatureLink entry={entry} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* 逐条标注是从 0.113 开始的习惯，更早的版本没有可反查的数据——不说明的话，
          「最早只到 0.113」看起来像是漏了 */}
      <p className="mt-4 flex items-start gap-1.5 text-sm text-fd-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          更早的版本没有逐条标注功能出处，其变更见{" "}
          <Link href="/changelog" className="text-fd-primary hover:underline">
            更新记录
          </Link>
          。
        </span>
      </p>
    </main>
  );
}
