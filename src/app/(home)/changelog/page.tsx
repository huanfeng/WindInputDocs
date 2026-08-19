import { Link2 } from "lucide-react";
import type { Metadata } from "next";
import { ReleaseNotes } from "@/components/release-notes";
import { SinceLinks } from "@/components/since-links";
import { minorOf, releases } from "@/lib/releases";
import { releasesUrl } from "@/lib/shared";
import { getSinceLinks } from "@/lib/since-index";

export const metadata: Metadata = {
  title: "更新记录",
  description: "清风输入法各版本的更新内容",
};

/** 每个 minor 版本里首个发布的版本号，如 `0.115` → `0.115.0`。
 *
 * 文档里的 `<Since v="0.115" />` 只精确到 minor，而 releases 有 0.115.0 / 0.115.1
 * 两条——不挑一条挂，同一批文档链接会在两处各列一遍。挂在首发版上：功能是那次带来的，
 * 补丁版只是修它。releases 按版本降序，同 minor 最后写入的即最早发布的那个。 */
const firstOfMinor = new Map<string, string>();
for (const r of releases) firstOfMinor.set(minorOf(r.version), r.version);

export default function ChangelogPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight">更新记录</h1>
      <p className="mt-3 text-fd-muted-foreground">
        更早的版本变更请见{" "}
        <a href={releasesUrl} className="text-fd-primary hover:underline">
          GitHub Releases
        </a>
        。
      </p>

      <div className="mt-10 flex flex-col">
        {releases.map((r) => {
          // 版本号里的点在 id 属性中合法，浏览器原生 hash 跳转不受影响；只是若日后要用
          // JS 查询，得走 getElementById——querySelector 会把 `.` 当成类选择器。
          const anchor = `v${r.version}`;

          return (
            <section
              key={r.version}
              className="relative border-l pb-10 pl-6 last:pb-0"
            >
              <span
                className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-fd-primary"
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-3">
                {/* scroll-mt 给固定顶栏留位，否则锚点跳转会把版本号顶到栏后面 */}
                <h2
                  id={anchor}
                  className="scroll-mt-24 font-mono text-xl font-bold"
                >
                  <a
                    href={`#${anchor}`}
                    className="group inline-flex items-center gap-1.5 transition-colors hover:text-fd-primary"
                    title={`v${r.version} 的直达链接`}
                  >
                    v{r.version}
                    <Link2
                      className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </a>
                </h2>
                {r.date && (
                  <time className="text-sm text-fd-muted-foreground">
                    {r.date}
                  </time>
                )}
              </div>
              {/* 同步脚本在 Release 未填更新说明时也会写入版本条目（下载页的直链
                  只依赖版本号），因此 notes 可能为空 */}
              {r.notes.length > 0 ? (
                <div className="mt-3">
                  <ReleaseNotes notes={r.notes} />
                </div>
              ) : (
                <p className="mt-3 text-fd-muted-foreground">
                  本次发布未提供更新说明，详见{" "}
                  <a
                    href={releasesUrl}
                    className="text-fd-primary hover:underline"
                  >
                    GitHub Releases
                  </a>
                  。
                </p>
              )}
              {firstOfMinor.get(minorOf(r.version)) === r.version && (
                <SinceLinks entries={getSinceLinks(r.version)} />
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
