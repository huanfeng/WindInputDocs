import type { Metadata } from "next";
import { releases } from "@/lib/releases";
import { releasesUrl } from "@/lib/shared";

export const metadata: Metadata = {
  title: "更新记录",
  description: "清风输入法各版本的更新内容",
};

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
        {releases.map((r) => (
          <section
            key={r.version}
            className="relative border-l pb-10 pl-6 last:pb-0"
          >
            <span
              className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-fd-primary"
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-mono text-xl font-bold">v{r.version}</h2>
              {r.date && (
                <time className="text-sm text-fd-muted-foreground">
                  {r.date}
                </time>
              )}
            </div>
            {/* 同步脚本在 Release 未填更新说明时也会写入版本条目（下载页的直链
                只依赖版本号），因此 notes 可能为空 */}
            {r.notes.length > 0 ? (
              <ul className="mt-3 list-inside list-disc space-y-1.5 text-fd-muted-foreground">
                {r.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
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
          </section>
        ))}
      </div>
    </main>
  );
}
