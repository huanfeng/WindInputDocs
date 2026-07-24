import { Apple, HardDrive, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DownloadStats } from "@/components/download-stats";
import { ReleaseNotes } from "@/components/release-notes";
import {
  currentVersion,
  releases,
  setupDownloadUrl,
  setupFileName,
} from "@/lib/releases";
import { releasesUrl } from "@/lib/shared";

// 下载页顶部展示最新版本的更新说明——数据源与直链同为 releases[0]，
// 不会与 /changelog 漂移。notes 可能为空（同步脚本只写了版本号）。
const latest = releases[0];

export const metadata: Metadata = {
  title: "下载",
  description: "下载清风输入法 Windows 安装包（Cloudflare R2 国内直连）",
};

const editions = [
  {
    icon: Package,
    title: "Windows 安装版",
    badge: "推荐",
    points: [
      "双击安装，支持自定义路径",
      "自动注册输入法组件，创建开始菜单与卸载入口",
      "用户数据保存在 %APPDATA%\\WindInput\\，升级不丢失",
    ],
  },
  {
    icon: HardDrive,
    title: "便携模式",
    badge: "由安装包释放",
    points: [
      "不单独提供下载包：运行安装包，选择便携解压模式释放到任意目录",
      "由启动器 wind_portable.exe 注册组件与开机启动",
      "用户数据固定在程序目录下的 userdata",
    ],
  },
  {
    icon: Apple,
    title: "macOS 版",
    badge: "开发中",
    points: [
      "尚未正式发布，功能与 Windows 版存在差异",
      "面向尝鲜用户的安装与试用说明见文档「macOS 版」页",
    ],
  },
];

export default function DownloadPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight">下载清风输入法</h1>
        <p className="mt-3 text-fd-muted-foreground">
          当前版本{" "}
          <code className="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-sm">
            v{currentVersion}
          </code>
          {" · "}Windows 10 / 11（64 位）
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={setupDownloadUrl}
            className="rounded-full bg-fd-primary px-6 py-2.5 font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            下载 {setupFileName}
          </a>
          <Link
            href="/docs/start/installation"
            className="rounded-full border px-6 py-2.5 font-medium transition-colors hover:bg-fd-accent"
          >
            安装指引
          </Link>
        </div>
        <p className="mt-4 text-sm text-fd-muted-foreground">
          Cloudflare R2 全球 CDN，国内直连
          <DownloadStats />
        </p>
        <p className="mt-1 text-sm text-fd-muted-foreground">
          备用渠道：
          <a href={releasesUrl} className="text-fd-primary hover:underline">
            GitHub Releases
          </a>
          （国内访问较慢）
        </p>
      </div>

      {latest.notes.length > 0 && (
        <section className="mt-12 rounded-lg border bg-fd-card/50 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="font-semibold text-fd-foreground">
              本次更新{" "}
              <span className="font-mono text-fd-primary">
                v{latest.version}
              </span>
            </h2>
            {latest.date && (
              <time className="text-sm text-fd-muted-foreground">
                {latest.date}
              </time>
            )}
          </div>
          <div className="mt-3 text-sm leading-relaxed">
            <ReleaseNotes notes={latest.notes} />
          </div>
          <Link
            href="/changelog"
            className="mt-3 inline-block text-sm text-fd-primary hover:underline"
          >
            查看完整更新记录 →
          </Link>
        </section>
      )}

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {editions.map((e) => (
          <div key={e.title} className="flex flex-col rounded-lg border p-5">
            <div className="mb-3 flex items-center gap-2">
              <e.icon className="size-5 text-fd-primary" aria-hidden />
              <h2 className="font-semibold">{e.title}</h2>
              {e.badge && (
                <span className="rounded-full bg-fd-primary/10 px-2 py-0.5 text-xs font-medium text-fd-primary">
                  {e.badge}
                </span>
              )}
            </div>
            <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-fd-muted-foreground">
              {e.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-lg border bg-fd-card/50 p-5 text-sm leading-relaxed text-fd-muted-foreground">
        <h2 className="mb-2 font-semibold text-fd-foreground">下载前须知</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            当前版本无数字签名，Windows SmartScreen
            可能拦截：点「更多信息」→「仍要运行」即可继续。
          </li>
          <li>
            第三方码表方案（五笔 98、新世纪、虎码等）见社区仓库{" "}
            <a
              href="https://github.com/huanfeng/WindInputCodeTable"
              className="text-fd-primary hover:underline"
            >
              WindInputCodeTable
            </a>
            。
          </li>
          <li>
            macOS 版开发中，说明见
            <Link
              href="/docs/reference/macos"
              className="text-fd-primary hover:underline"
            >
              macOS 版
            </Link>
            页。
          </li>
          <li>
            版本变更详情见
            <Link href="/changelog" className="text-fd-primary hover:underline">
              更新记录
            </Link>
            。
          </li>
        </ul>
      </div>
    </main>
  );
}
