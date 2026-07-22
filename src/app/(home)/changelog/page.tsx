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
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-fd-muted-foreground">
              {r.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
