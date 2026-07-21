import Link from 'next/link';
import { releasesUrl } from '@/lib/shared';

const features = [
  {
    title: '专为五笔设计',
    body: '支持五笔 86 及五笔拼音混输，可导入五笔 98、新世纪、虎码等第三方码表。',
  },
  {
    title: '拼音输入',
    body: '全拼、双拼（小鹤 / 自然码等 6 种布局）、简拼与模糊音，词库基于白霜拼音。',
  },
  {
    title: '开源免费，隐私无忧',
    body: '代码完全开源，永久免费。输入内容只在本机处理，绝不上传。',
  },
  {
    title: '图形化设置',
    body: '内置设置工具，所有配置可视化调整，修改即时生效。',
  },
  {
    title: '高度可定制',
    body: 'TOML 方案文件驱动，候选排序、快捷键、主题外观均可自定义。',
  },
  {
    title: '轻量运行',
    body: '资源占用低，启动迅速，完美适配高 DPI 与多显示器。',
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-col flex-1 items-center px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">清风输入法</h1>
      <p className="text-lg text-fd-muted-foreground mb-8 max-w-xl">
        轻量、快速、可定制的开源中文输入法
        <br />
        支持五笔、全拼、双拼及混合输入
      </p>
      <div className="flex gap-3 mb-16">
        <a
          href={releasesUrl}
          className="rounded-full bg-fd-primary px-6 py-2.5 font-medium text-fd-primary-foreground"
        >
          下载
        </a>
        <Link
          href="/docs/start/installation"
          className="rounded-full border px-6 py-2.5 font-medium"
        >
          开始使用
        </Link>
      </div>
      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border p-4">
            <h2 className="font-semibold mb-1.5">{f.title}</h2>
            <p className="text-sm text-fd-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
