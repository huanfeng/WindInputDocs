"use client";

import Link from "fumadocs-core/link";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "fumadocs-ui/components/ui/collapsible";
import {
  SidebarCollapseTrigger,
  SidebarTrigger,
} from "fumadocs-ui/layouts/notebook/slots/sidebar";
import {
  type LinkItemType,
  resolveLinkItems,
} from "fumadocs-ui/layouts/shared";
import {
  FullSearchTrigger,
  SearchTrigger,
} from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { ArrowUpRight, Menu, MessagesSquare, PanelLeft } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { type ComponentProps, useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { SiteNotice } from "@/components/site-notice";
import { cn } from "@/lib/cn";
import { appName, forumUrl, githubUrl, navLinks } from "@/lib/shared";

/**
 * 站点顶栏。主页布局与文档布局都通过 `slots.header` 使用同一个组件，
 * 桌面端的结构、间距与样式因此天然一致，无需逐条 CSS 对齐。
 *
 * 两种形态的差异只在移动端入口：文档页用侧栏抽屉（内含目录与站点链接），
 * 主页用折叠菜单。文档页另有侧栏折叠按钮，放在标题左侧。
 */
export function HomeNavbar() {
  return <SiteNavbar variant="home" />;
}

/** 文档侧栏顶部的折叠按钮。折叠后由顶栏上的同名按钮负责重新展开。 */
export function SidebarCollapseButton({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("flex justify-end", className)} {...props}>
      <SidebarCollapseTrigger
        className={cn(
          buttonVariants({ color: "ghost", size: "icon-sm" }),
          "-me-1.5 text-fd-muted-foreground",
        )}
      >
        <PanelLeft />
      </SidebarCollapseTrigger>
    </div>
  );
}

export function DocsNavbar() {
  return <SiteNavbar variant="docs" />;
}

function SiteNavbar({ variant }: { variant: "home" | "docs" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const items = resolveLinkItems({ links: navLinks, githubUrl });
  const mainItems = items.filter((item) => item.type !== "icon");
  const iconItems = items.filter((item) => item.type === "icon");
  const isDocs = variant === "docs";

  return (
    <Collapsible
      open={menuOpen}
      onOpenChange={setMenuOpen}
      render={
        <header
          id="site-navbar"
          data-variant={variant}
          className="sticky z-30 border-b bg-fd-background/80 backdrop-blur-lg"
        >
          <div className="mx-auto flex h-14 w-full max-w-(--fd-layout-width) items-center gap-2 px-4">
            {/* 侧栏展开时折叠按钮在侧栏里（见 SidebarCollapseButton），
                只有折叠后才出现在这里用于重新展开——因此默认状态下
                两个形态的顶栏结构完全相同 */}
            {isDocs && (
              <SidebarCollapseTrigger
                className={cn(
                  buttonVariants({ color: "ghost", size: "icon-sm" }),
                  "-ms-1.5 shrink-0 text-fd-muted-foreground",
                  "max-md:hidden data-[collapsed=false]:hidden",
                )}
              >
                <PanelLeft />
              </SidebarCollapseTrigger>
            )}

            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-2.5 font-semibold whitespace-nowrap"
            >
              <Image
                src={logo}
                alt=""
                width={22}
                height={22}
                className="rounded-[5px]"
              />
              {appName}
            </Link>

            <nav className="flex shrink-0 items-center gap-6 ps-6 whitespace-nowrap max-lg:hidden">
              {mainItems.map((item, i) => (
                <NavbarLink
                  // biome-ignore lint/suspicious/noArrayIndexKey: 静态导航表，顺序固定
                  key={i}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </nav>

            <div className="ms-auto flex min-w-0 items-center gap-2">
              <SiteNotice />
              <ForumLink />
              <FullSearchTrigger
                hideIfDisabled
                className="w-full max-w-[240px] min-w-0 rounded-full ps-2.5 max-md:hidden"
              />
              <SearchTrigger
                hideIfDisabled
                className="shrink-0 p-2 md:hidden"
              />
              <ThemeSwitch className="shrink-0 max-md:hidden" />
              {iconItems.map((item, i) => (
                <NavbarLink
                  // biome-ignore lint/suspicious/noArrayIndexKey: 静态导航表，顺序固定
                  key={i}
                  item={item}
                  pathname={pathname}
                  className={cn(
                    buttonVariants({ color: "ghost", size: "icon-sm" }),
                    "shrink-0 text-fd-muted-foreground max-md:hidden",
                  )}
                />
              ))}
              {isDocs ? (
                <SidebarTrigger
                  className={cn(
                    buttonVariants({ color: "ghost", size: "icon-sm" }),
                    "-me-1.5 shrink-0 p-2 lg:hidden",
                  )}
                >
                  <Menu />
                </SidebarTrigger>
              ) : (
                <CollapsibleTrigger
                  aria-label="切换菜单"
                  className={cn(
                    buttonVariants({ color: "ghost", size: "icon-sm" }),
                    "-me-1.5 shrink-0 p-2 lg:hidden",
                  )}
                >
                  <Menu />
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {/* 主页移动端菜单；文档页的移动端入口是侧栏抽屉，不用这里 */}
          {!isDocs && (
            <CollapsibleContent className="lg:hidden">
              <div className="mx-auto flex max-w-(--fd-layout-width) flex-col gap-1 px-4 pb-4">
                {mainItems.map((item, i) => (
                  <NavbarLink
                    // biome-ignore lint/suspicious/noArrayIndexKey: 静态导航表，顺序固定
                    key={i}
                    item={item}
                    pathname={pathname}
                    className="rounded-md p-2 hover:bg-fd-accent"
                    onClick={() => setMenuOpen(false)}
                  />
                ))}
                <div className="mt-2 flex items-center gap-2 border-t pt-3">
                  <ThemeSwitch />
                  {iconItems.map((item, i) => (
                    <NavbarLink
                      // biome-ignore lint/suspicious/noArrayIndexKey: 静态导航表，顺序固定
                      key={i}
                      item={item}
                      pathname={pathname}
                      className={cn(
                        buttonVariants({ color: "ghost", size: "icon-sm" }),
                        "text-fd-muted-foreground",
                      )}
                    />
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          )}
        </header>
      }
    />
  );
}

/** 论坛入口出现前要先翻过的页数，见 ForumLink */
const FORUM_VISIT_THRESHOLD = 5;
/** 累计翻页数的存储键。存的是 `{ n: 页数, p: 上一个路径 }` */
const FORUM_VISIT_KEY = "wi-nav";

/**
 * 记一次翻页，返回累计值。**同一个路径连着来不重复计**——刷新、回退、点了当前页
 * 自己都不算新的一页，否则停在首页按几下 F5 就能把门槛刷满，计数也就不再代表
 * 「这个人真的在站里走动」。
 *
 * localStorage 写不进去（隐私模式）时返回 0：计数永远不达标，入口保持隐藏。
 * 这是刻意的保守失败——入口藏着只是少一个链接，文档页底部的反馈引导仍在。
 */
function countVisit(pathname: string): number {
  try {
    const raw = localStorage.getItem(FORUM_VISIT_KEY);
    const prev = raw ? JSON.parse(raw) : null;
    const n = typeof prev?.n === "number" ? prev.n : 0;
    if (prev?.p === pathname) return n;
    const next = n + 1;
    localStorage.setItem(
      FORUM_VISIT_KEY,
      JSON.stringify({ n: next, p: pathname }),
    );
    return next;
  } catch {
    return 0;
  }
}

/**
 * 问题反馈入口（指向社区论坛）。占的是旧留言入口那个位置 —— 留言随主域迁到
 * EdgeOne 时整块下架（那套自建评论的前后端已分别删除与移出本仓），右侧这一格
 * 就空了出来。
 *
 * 真要再做站内留言，得先决定它和论坛的分工，那时再排版。
 *
 * 叫「问题反馈」而不是「社区」：这一格的用处是遇到问题时有地方问，名字直说用途，
 * 比一个需要先点进去才知道是什么的泛称更有用。
 *
 * **翻够 FORUM_VISIT_THRESHOLD 页才出现**，且未达标时压根不渲染，不是用 CSS 藏
 * （HTML 里因此也没有这个链接）。求助入口是给已经在用、已经撞上问题的人准备的；
 * 头一回到访的人该先看文档，一个陌生的站外链接这时只会分走注意力。达标当场出现，
 * 不必等下次进站。
 *
 * 代价是每次进站都晚一帧才出现——入口本身就是渐显的，这一帧无所谓。公告胶囊
 * （site-notice.tsx）之所以要走 `<head>` 同步脚本，是因为它那颗红点每翻一页都会
 * 重闪一次，两者的取舍不一样。
 *
 * 为什么不写进 navLinks —— 那里已经有主题编辑器和主题市场两个兄弟站，看着像是
 * 它的天然去处。但 navLinks 会被左侧主导航、主页移动端折叠菜单和文档侧栏抽屉
 * 三处共用，而左侧已经八项，再加一项就要挤换行了。放右边还有一层用意：这是
 * 「有问题找人」的入口，和搜索挨着比夹在一串页面链接里更容易被想起来。
 *
 * 它**不跟随** ThemeSwitch / GitHub 图标的 `max-md:hidden` —— 不在 navLinks 里，
 * 移动端菜单自然没有它，只能在顶栏退化成纯图标继续留着，
 * 否则小屏上就彻底没有入口了。
 */
function ForumLink() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (countVisit(pathname) >= FORUM_VISIT_THRESHOLD) setVisible(true);
  }, [pathname]);

  if (!visible) return null;

  return (
    <Link
      href={forumUrl}
      external
      title="反馈问题与提问"
      className={cn(
        buttonVariants({ color: "ghost", size: "icon-sm" }),
        "shrink-0 gap-1.5 text-fd-muted-foreground transition-colors",
        "hover:text-fd-accent-foreground",
        // 桌面端带文字，图标按钮的方形尺寸要放开；移动端只留图标。
        "md:w-auto md:px-2.5",
      )}
    >
      <MessagesSquare className="size-4 shrink-0" aria-hidden />
      <span className="text-sm max-md:hidden">问题反馈</span>
    </Link>
  );
}

function NavbarLink({
  item,
  pathname,
  className,
  ...props
}: ComponentProps<"a"> & { item: LinkItemType; pathname: string }) {
  if (!("url" in item) || !item.url) return null;
  const active = isItemActive(item, pathname);

  return (
    <Link
      href={item.url}
      external={item.external}
      data-active={active}
      aria-label={item.type === "icon" ? item.label : undefined}
      className={cn(
        "text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary",
        className,
      )}
      {...props}
    >
      {item.type === "icon" ? (
        item.icon
      ) : item.external ? (
        <span className="inline-flex items-center gap-0.5">
          {item.text}
          <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
        </span>
      ) : (
        item.text
      )}
    </Link>
  );
}

function isItemActive(item: LinkItemType, pathname: string): boolean {
  if (!("url" in item) || !item.url) return false;
  if (item.active === "none" || item.external) return false;
  if (item.active === "nested-url") {
    return pathname === item.url || pathname.startsWith(`${item.url}/`);
  }
  return pathname === item.url;
}
