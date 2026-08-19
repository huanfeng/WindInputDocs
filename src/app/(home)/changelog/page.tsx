import { ArrowRight, Link2, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ReleaseNotes } from "@/components/release-notes";
import { SinceLinks } from "@/components/since-links";
import { isFirstOfMinor, releases } from "@/lib/releases";
import { releasesUrl } from "@/lib/shared";
import { getSinceLinks } from "@/lib/since-index";

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

      {/* 看更新记录的人多半是刚升级完、想知道新功能怎么开——本页每个版本块底部
          都挂着相关文档，但要滚很久才看得到，这里先给一个纵览全部版本的入口 */}
      <Link
        href="/whats-new"
        className="mt-5 inline-flex items-center gap-2 rounded-lg border bg-fd-card px-4 py-2.5 text-sm transition-colors hover:border-fd-primary/40 hover:bg-fd-primary/5"
      >
        <Sparkles className="size-4 text-fd-primary" aria-hidden />
        <span className="font-medium">想知道新功能怎么配？</span>
        <span className="text-fd-muted-foreground">
          按版本查看新功能与配置说明
        </span>
        <ArrowRight className="size-3.5 text-fd-muted-foreground" aria-hidden />
      </Link>

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
              {isFirstOfMinor(r.version) && (
                <SinceLinks entries={getSinceLinks(r.version)} />
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
