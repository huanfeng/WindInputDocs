import {
  Feather,
  Keyboard,
  Languages,
  Palette,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { releasesUrl } from '@/lib/shared';

const features = [
  {
    icon: Keyboard,
    title: '专为五笔设计',
    body: '五笔 86、五笔拼音混输，可导入五笔 98、新世纪、虎码等第三方码表。顶码上屏、自动造词一应俱全。',
  },
  {
    icon: Languages,
    title: '拼音输入',
    body: '全拼、简拼与 6 种双拼布局，词库基于白霜拼音，支持模糊音与智能组词。',
  },
  {
    icon: ShieldCheck,
    title: '开源免费，隐私无忧',
    body: '代码完全开源，永久免费。输入内容只在本机处理，绝不上传。',
  },
  {
    icon: Settings2,
    title: '图形化设置',
    body: '内置设置工具，所有配置可视化调整，修改即时生效，无需重启。',
  },
  {
    icon: Palette,
    title: '主题随心换',
    body: '亮暗主题跟随系统，候选窗外观由主题文件定义，可在线设计、下载社区主题。',
  },
  {
    icon: Feather,
    title: '轻量运行',
    body: '资源占用低，启动迅速，完美适配高 DPI 与多显示器。',
  },
];

const schemas = [
  { name: '全拼', id: 'pinyin' },
  { name: '双拼', id: 'shuangpin' },
  { name: '五笔 86', id: 'wubi86' },
  { name: '五笔拼音', id: 'wubi86_pinyin' },
];

const candidates = [
  { n: 1, text: '清风', active: true },
  { n: 2, text: '轻风', active: false },
  { n: 3, text: '氢', active: false },
  { n: 4, text: '卿', active: false },
  { n: 5, text: '倾', active: false },
];

function CandidateWindow() {
  return (
    <div className="relative" aria-hidden>
      {/* 柔光 */}
      <div className="absolute -inset-8 rounded-full bg-fd-primary/15 blur-3xl" />
      <div className="relative -rotate-2 rounded-xl border bg-fd-card p-4 shadow-2xl">
        {/* 编码行 */}
        <div className="flex items-center gap-0.5 px-1 pb-3 font-mono text-lg text-fd-foreground">
          <span>qing'feng</span>
          <span className="ml-0.5 inline-block h-5 w-px animate-pulse bg-fd-primary motion-reduce:animate-none" />
        </div>
        {/* 候选行 */}
        <div className="flex items-stretch gap-1">
          {candidates.map((c) => (
            <div
              key={c.n}
              className={
                c.active
                  ? 'flex items-baseline gap-1 rounded-md bg-fd-primary px-2.5 py-1.5 text-fd-primary-foreground'
                  : 'flex items-baseline gap-1 rounded-md px-2.5 py-1.5 text-fd-foreground'
              }
            >
              <span
                className={
                  c.active
                    ? 'text-xs text-fd-primary-foreground/70'
                    : 'text-xs text-fd-muted-foreground'
                }
              >
                {c.n}
              </span>
              <span className="text-lg">{c.text}</span>
            </div>
          ))}
          <div className="ml-1 flex flex-col justify-center gap-0.5 px-1 text-fd-muted-foreground">
            <span className="text-[10px] leading-none">▲</span>
            <span className="text-[10px] leading-none">▼</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="mx-auto grid w-full max-w-5xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <p className="mb-3 font-mono text-sm uppercase tracking-[0.3em] text-fd-muted-foreground">
            WindInput
          </p>
          <h1 className="text-5xl font-black leading-tight tracking-tight">
            清风输入法
          </h1>
          <p className="mt-5 text-lg text-fd-muted-foreground">
            轻量、快速、可定制的开源中文输入法。
            <br />
            五笔、全拼、双拼与混输——词库、按键、外观，全部由你定义。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={releasesUrl}
              className="rounded-full bg-fd-primary px-6 py-2.5 font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
            >
              下载
            </a>
            <Link
              href="/docs/start/installation"
              className="rounded-full border px-6 py-2.5 font-medium transition-colors hover:bg-fd-accent"
            >
              开始使用
            </Link>
          </div>
          <p className="mt-4 text-sm text-fd-muted-foreground">
            Windows 10 / 11 · macOS（alpha）
          </p>
        </div>
        <div className="flex justify-center md:justify-end">
          <CandidateWindow />
        </div>
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

      {/* 尾部 CTA */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-20 text-center">
        <div className="rounded-2xl border bg-fd-card px-6 py-12">
          <h2 className="text-2xl font-bold">几分钟就能用上</h2>
          <p className="mx-auto mt-3 max-w-md text-fd-muted-foreground">
            下载安装包，按引导完成安装；从「快速开始」了解打字、选词与切换的全部日常操作。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href={releasesUrl}
              className="rounded-full bg-fd-primary px-6 py-2.5 font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
            >
              下载
            </a>
            <Link
              href="/docs"
              className="rounded-full border px-6 py-2.5 font-medium transition-colors hover:bg-fd-accent"
            >
              浏览文档
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
