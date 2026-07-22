import { Apple, HardDrive, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { currentVersion } from "@/lib/releases";
import { releasesUrl } from "@/lib/shared";

export const metadata: Metadata = {
  title: "下载",
  description: "下载清风输入法：Windows 安装版、便携版与 macOS alpha 版",
};

const latestUrl = `${releasesUrl}/latest`;

const editions = [
  {
    icon: Package,
    title: "Windows 安装版",
    badge: "推荐",
    file: "WindInput-x.x.x-Setup.exe",
    points: [
      "双击安装，支持自定义路径",
      "自动注册输入法组件，创建开始菜单与卸载入口",
      "用户数据保存在 %APPDATA%\\WindInput\\，升级不丢失",
    ],
  },
  {
    icon: HardDrive,
    title: "Windows 便携版",
    badge: null,
    file: "WindInput-x.x.x-Portable.zip",
    points: [
      "解压即用，适合 U 盘携带",
      "由启动器 wind_portable.exe 注册组件与开机启动",
      "用户数据固定在程序目录下的 userdata",
    ],
  },
  {
    icon: Apple,
    title: "macOS 版",
    badge: "alpha",
    file: "WindInput-x.x.x-macOS.pkg",
    points: [
      "universal 安装包，同时支持 Apple Silicon 与 Intel",
      "内含输入法、后台服务、设置程序三件套",
      "未做苹果公证，首次运行需在 Gatekeeper 中放行",
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
          {" · "}Windows 10 / 11（64 位）· macOS 12+（alpha）
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a
            href={latestUrl}
            className="rounded-full bg-fd-primary px-6 py-2.5 font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            前往 GitHub Releases 下载
          </a>
          <Link
            href="/docs/start/installation"
            className="rounded-full border px-6 py-2.5 font-medium transition-colors hover:bg-fd-accent"
          >
            安装指引
          </Link>
        </div>
      </div>

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
            <code className="mb-3 w-fit rounded bg-fd-muted px-1.5 py-0.5 font-mono text-xs text-fd-muted-foreground">
              {e.file}
            </code>
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
