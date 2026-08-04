import {
  Feather,
  Keyboard,
  Languages,
  Palette,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
// 从 src/ 静态导入而非放 public/：产物会带内容 hash（/_next/static/media/…），
// 换图即换 URL，不会被 CDN 的长缓存挡住旧版本。尺寸也由导入对象自带。
import screenshotCandidates from "@/assets/screenshot-candidates.png";
import { TipTicker } from "@/components/tip-ticker";

const features = [
  {
    icon: Keyboard,
    title: "专为五笔设计",
    body: "五笔 86、五笔拼音混输，可导入五笔 98、新世纪、虎码等第三方码表。顶码上屏、自动造词一应俱全。",
  },
  {
    icon: Languages,
    title: "拼音输入",
    body: "全拼、简拼与 6 种双拼布局，词库基于白霜拼音，支持模糊音与智能组词。",
  },
  {
    icon: ShieldCheck,
    title: "开源免费，隐私无忧",
    body: "核心代码完全开源，永久免费。输入内容只在本机处理，绝不上传。",
  },
  {
    icon: Settings2,
    title: "图形化设置",
    body: "内置设置工具，所有配置可视化调整，修改即时生效，无需重启。",
  },
  {
    icon: Palette,
    title: "主题随心换",
    body: "亮暗主题跟随系统，候选窗外观由主题文件定义，可在线设计、下载社区主题。",
  },
  {
    icon: Feather,
    title: "轻量运行",
    body: "资源占用低，启动迅速，完美适配高 DPI 与多显示器。",
  },
];

const schemas = [
  { name: "全拼", id: "pinyin" },
  { name: "双拼", id: "shuangpin" },
  { name: "五笔 86", id: "wubi86" },
  { name: "五笔拼音", id: "wubi86_pinyin" },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 pt-20 pb-16 text-center md:pt-28">
        <p className="mb-3 font-mono text-sm uppercase tracking-[0.3em] text-fd-muted-foreground">
          WindInput
        </p>
        <h1 className="text-5xl font-black leading-tight tracking-tight">
          清风输入法
        </h1>
        <p className="mt-5 max-w-xl text-lg text-fd-muted-foreground">
          轻量、快速、可定制的开源中文输入法。
          五笔、全拼、双拼与混输——词库、按键、外观，全部由你定义。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/download"
            className="rounded-full bg-fd-primary px-6 py-2.5 font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            下载
          </Link>
          <Link
            href="/docs/start/installation"
            className="rounded-full border px-6 py-2.5 font-medium transition-colors hover:bg-fd-accent"
          >
            开始使用
          </Link>
        </div>
        <p className="mt-4 text-sm text-fd-muted-foreground">
          Windows 10 / 11 · macOS 版开发中
        </p>
        {/* 实际候选窗截图。原图 1140×188，显示宽度按屏幕密度分档（见 global.css
            的 .hero-screenshot），各档都是超采样，任何缩放下都不发糊 */}
        <div className="relative mt-14 max-w-full">
          <div
            className="absolute -inset-6 rounded-full bg-fd-primary/15 blur-3xl"
            aria-hidden
          />
          <Image
            src={screenshotCandidates}
            alt="清风输入法候选窗截图：输入 qing'feng，首选候选「清风」"
            priority
            className="hero-screenshot relative h-auto rounded-xl shadow-2xl"
          />
        </div>
      </section>

      {/* 技巧轮播。紧跟截图：看完「长什么样」，接着就是「它还能做什么」。
          上间距由 hero 的 pb-16 提供，这里只补下间距 */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <TipTicker />
      </section>

      {/* 内置方案 */}
      <section className="border-y bg-fd-card/50">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-6">
          <span className="text-sm text-fd-muted-foreground">内置方案</span>
          {schemas.map((s) => (
            <span key={s.id} className="flex items-baseline gap-2">
              <span className="font-medium">{s.name}</span>
              <code className="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-xs text-fd-muted-foreground">
                {s.id}
              </code>
            </span>
          ))}
          <Link
            href="/docs/customize/schemas"
            className="ms-auto text-sm text-fd-primary hover:underline"
          >
            导入更多码表 →
          </Link>
        </div>
      </section>

      {/* 特性 */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border p-5 transition-colors hover:bg-fd-accent/50"
            >
              <f.icon className="mb-3 size-5 text-fd-primary" aria-hidden />
              <h2 className="mb-1.5 font-semibold">{f.title}</h2>
              <p className="text-sm leading-relaxed text-fd-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 支持项目。放在特性之后、页面末尾——读者看完项目做了什么，再谈支持 */}
      <section className="border-t bg-fd-card/50">
        <div className="mx-auto w-full max-w-5xl px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">开源免费，由业余时间维护</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-fd-muted-foreground">
            没有广告、没有内购。一个 Star、一份问题反馈，或是一次小额赞助，
            都会让它走得更远。
          </p>
          <Link
            href="/sponsor"
            className="mt-5 inline-block rounded-full border px-5 py-2 text-sm font-medium transition-colors hover:bg-fd-accent"
          >
            支持项目
          </Link>
        </div>
      </section>
    </main>
  );
}
