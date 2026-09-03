import { Apple, HardDrive, type LucideIcon, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DownloadStats } from "@/components/download-stats";
import { ReleaseNotes } from "@/components/release-notes";
import { TipTicker } from "@/components/tip-ticker";
import {
  currentVersion,
  macDownloadUrl,
  macFileName,
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
  description: "下载清风输入法 Windows / macOS 安装包",
};

// download 可选：Windows / macOS 的直链已在页首的按钮给出，卡片里不重复；
// 便携模式由安装包释放，没有独立下载包，故卡片不带下载入口。
interface Edition {
  icon: LucideIcon;
  title: string;
  badge?: string;
  points: string[];
  download?: { url: string; label: string };
}

const editions: Edition[] = [
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
    icon: Apple,
    title: "macOS 版",
    badge: "macOS 12+",
    points: [
      "universal 安装包，Apple Silicon / Intel 通用",
      "未做苹果签名：首次运行需到「系统设置 → 隐私与安全性」放行",
      "标点配对、命令直通车按键合成需授权「辅助功能」",
      "没有工具栏（改用菜单栏指示器），菜单由系统渲染、不受主题控制",
    ],
    download: { url: macDownloadUrl, label: macFileName },
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
          {" · "}Windows 10 / 11（64 位） · macOS 12+
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={setupDownloadUrl}
            className="rounded-full bg-fd-primary px-6 py-2.5 font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            下载 {setupFileName}
          </a>
          <a
            href={macDownloadUrl}
            className="rounded-full border px-6 py-2.5 font-medium transition-colors hover:bg-fd-accent"
          >
            下载 macOS 版
          </a>
          <Link
            href="/docs/start/installation"
            className="rounded-full border px-6 py-2.5 font-medium transition-colors hover:bg-fd-accent"
          >
            安装指引
          </Link>
        </div>
        <DownloadStats />
      </div>

      {/* 技巧轮播。紧接下载按钮：装包的空档正好扫一眼「装完能玩什么」 */}
      <TipTicker className="mt-10" />

      {latest.notes.length > 0 && (
        <section className="mt-8 rounded-lg border bg-fd-card/50 p-5">
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
            {e.download && (
              <a
                href={e.download.url}
                className="mt-4 inline-block break-all rounded-full border px-4 py-2 text-center text-sm font-medium transition-colors hover:bg-fd-accent"
              >
                下载 {e.download.label}
              </a>
            )}
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
            macOS 版同样未签名，且需要额外授权：先到「系统设置 → 隐私与安全性」
            放行被拦截的程序，再到「辅助功能」里打开清风输入法，否则标点配对、
            命令直通车按键合成等功能会静默失效。步骤见
            <Link
              href="/docs/reference/macos"
              className="text-fd-primary hover:underline"
            >
              macOS 版
            </Link>
            页。
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
          <li>
            直连下载较慢或访问受限时，也可从{" "}
            <a href={releasesUrl} className="text-fd-primary hover:underline">
              GitHub Releases
            </a>{" "}
            获取安装包。
          </li>
        </ul>
      </div>

      {/* 「无数字签名」这条须知正上方就是 SmartScreen 的坑，而代码签名证书恰是赞助
          资金的首要用途——入口放在这里，用途与痛点自然衔接 */}
      <p className="mt-8 text-center text-sm text-fd-muted-foreground">
        清风输入法开源免费。如果它帮到了你，欢迎
        <Link href="/sponsor" className="text-fd-primary hover:underline">
          支持这个项目
        </Link>
        。
      </p>
    </main>
  );
}
