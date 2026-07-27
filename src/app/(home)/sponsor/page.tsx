import {
  BookOpen,
  Bug,
  Mail,
  MessageCircle,
  Palette,
  Star,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SponsorQr } from "@/components/sponsor-qr";
import { githubUrl } from "@/lib/shared";
import { contactEmail, qqGroup } from "@/lib/sponsor";

export const metadata: Metadata = {
  title: "支持项目",
  description:
    "清风输入法开源免费。你可以通过 Star、反馈、贡献码表与主题来支持它，也可以选择赞助——赞助为自愿赠与，不产生任何特权。",
};

const issuesUrl = `${githubUrl}/issues`;

// 这些方式排在赞助之前：它们对项目的价值本就不低于资金，而且能让每位读者都找到
// 自己的位置，整页不至于只剩「要钱」一个意图。
const supportWays = [
  {
    icon: Star,
    title: "点一个 Star",
    body: "GitHub 上的 Star 直接决定项目能被多少人看见，是最有效的一种支持。",
    href: githubUrl,
    action: "去 GitHub",
  },
  {
    icon: Bug,
    title: "反馈问题与建议",
    body: "一份写清了复现步骤与环境的 Issue，往往比十句「有 bug」更有价值。",
    href: issuesUrl,
    action: "提交 Issue",
  },
  {
    icon: Palette,
    title: "贡献码表与主题",
    body: "把你调好的码表方案或候选窗主题分享出来，让后来者少走弯路。",
    href: "/docs/customize/schemas",
    action: "查看方案文档",
  },
  {
    icon: BookOpen,
    title: "写教程、做视频",
    body: "一篇上手笔记、一段配置心得，或是一条演示视频，都会帮到正在摸索的新用户。",
  },
  {
    icon: MessageCircle,
    title: "帮忙答疑",
    body: "在 QQ 群或 Issue 区回答别人的问题，能省下大量本该用于开发的时间。",
    href: qqGroup.url,
    action: "加入 QQ 群",
  },
];

// 按优先级排列，页面会渲染成有序列表——顺序即承诺，调整时留意与正文「按下列顺序
// 使用」的表述保持一致。代码签名这项对应下载页至今写着的「无数字签名，SmartScreen
// 可能拦截」，是用户亲身遇到过的痛点。
const fundUses = [
  {
    title: "域名与分发",
    body: "域名续费，以及安装包分发所用的对象存储与流量",
  },
  {
    title: "开发工具与 AI 订阅",
    body: "AI 编程工具、第三方服务订阅与 API 费用",
  },
  {
    title: "代码签名证书",
    body: "为安装包签名，消除 Windows SmartScreen 的拦截提示",
  },
  {
    title: "开发者账号",
    body: "macOS 版发布所需的 Apple Developer 年费等平台费用",
  },
];

const principles = [
  {
    title: "不构成购买",
    body: "赞助是自愿的赠与，不是购买软件、服务或技术支持。清风输入法本身开源免费，不赞助也可以完整使用全部功能。",
  },
  {
    title: "不产生特权",
    body: "赞助不会提升 Issue 的处理优先级，不承诺定制开发，也不承诺任何功能的开发时间表。项目路线图始终由维护者依据项目愿景与社区需求决定。",
  },
  {
    title: "不让渡权益",
    body: "赞助不产生对代码、项目决策或品牌的任何所有权、控制权或收益权。",
  },
  {
    title: "不可退款、不开发票",
    body: "个人维护的项目，无法提供发票或办理退款。请量力而行，建议单笔小额。",
  },
];

export default function SponsorPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight">支持项目</h1>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-fd-muted-foreground">
          清风输入法开源免费，没有广告和内购，靠业余时间维护。
          你的任何一种支持，都会让它走得更远。
        </p>
      </div>

      {/* 支持我们的方式 */}
      <section className="mt-14">
        <h2 className="text-xl font-bold">支持我们的方式</h2>
        <p className="mt-2 text-sm text-fd-muted-foreground">
          除了赞助，下面这些同样能帮到项目，而且分量一点不轻。
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {supportWays.map((w) => (
            <div key={w.title} className="flex flex-col rounded-lg border p-5">
              <div className="mb-2 flex items-center gap-2">
                <w.icon className="size-4 text-fd-primary" aria-hidden />
                <h3 className="font-semibold">{w.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-fd-muted-foreground">
                {w.body}
              </p>
              {w.href && (
                <Link
                  href={w.href}
                  className="mt-3 text-sm text-fd-primary hover:underline"
                >
                  {w.action} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 资金用途 */}
      <section className="mt-14">
        <h2 className="text-xl font-bold">赞助资金去向</h2>
        <p className="mt-2 text-sm text-fd-muted-foreground">
          优先覆盖项目运转必需的硬性开销，按下列顺序使用：
        </p>
        <ol className="mt-4 flex list-inside list-decimal flex-col gap-2 rounded-lg border bg-fd-card/50 p-5 text-sm leading-relaxed text-fd-muted-foreground">
          {fundUses.map((u) => (
            <li key={u.title}>
              <strong className="font-semibold text-fd-foreground">
                {u.title}
              </strong>
              ——{u.body}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-fd-muted-foreground">
          若有结余，将用于维护者在这个项目上的时间投入。
        </p>
      </section>

      {/* 原则与免责 */}
      <section className="mt-14">
        <h2 className="text-xl font-bold">赞助原则</h2>
        <p className="mt-2 text-sm text-fd-muted-foreground">
          为了让项目长期健康地走下去，也为了避免误会，请在赞助前知悉：
        </p>
        <dl className="mt-5 flex flex-col gap-4 rounded-lg border bg-fd-card/50 p-6">
          {principles.map((p) => (
            <div key={p.title}>
              <dt className="font-semibold">{p.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fd-muted-foreground">
                {p.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 赞助方式。刻意排在资金去向与原则之后：读者读完钱的去向和「不产生特权」
          再看到收款码，扫码才是知情之后的决定。这也是本页最初的诉求 */}
      <section className="mt-14">
        <h2 className="text-xl font-bold">赞助方式</h2>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          读完上面的说明，如果你仍愿意支持它继续做下去，可以请作者喝杯咖啡。
        </p>
        <div className="mt-5">
          <SponsorQr />
        </div>
      </section>

      {/* 致谢 */}
      <section className="mt-14">
        <h2 className="text-xl font-bold">致谢</h2>
        <p className="mt-3 leading-relaxed text-fd-muted-foreground">
          感谢每一位支持过清风输入法的朋友——无论是一次赞助、一个 Star，
          还是一份认真写下的问题反馈。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">
          目前不单独公开赞助者名单，未留备注的赞助一律按匿名处理。
          如果你希望被公开鸣谢，或想以企业名义支持本项目，欢迎联系作者。
        </p>
      </section>

      {/* 联系 */}
      <section className="mt-14 rounded-lg border bg-fd-card/50 p-5 text-sm leading-relaxed text-fd-muted-foreground">
        <h2 className="mb-2 font-semibold text-fd-foreground">联系方式</h2>
        <ul className="flex flex-col gap-1.5">
          <li className="flex items-center gap-2">
            <Users className="size-4 shrink-0" aria-hidden />
            QQ 交流群：
            <a href={qqGroup.url} className="text-fd-primary hover:underline">
              {qqGroup.number}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Bug className="size-4 shrink-0" aria-hidden />
            问题与功能建议：
            <Link href={issuesUrl} className="text-fd-primary hover:underline">
              GitHub Issue
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <Mail className="size-4 shrink-0" aria-hidden />
            赞助疑问、企业支持、公开鸣谢：
            <a
              href={`mailto:${contactEmail}`}
              className="text-fd-primary hover:underline"
            >
              {contactEmail}
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
