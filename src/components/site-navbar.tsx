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
import {
  ArrowUpRight,
  Menu,
  MessageSquare,
  MessagesSquare,
  PanelLeft,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { type ComponentProps, useState } from "react";
import logo from "@/assets/logo.png";
import { SiteNotice } from "@/components/site-notice";
import { cn } from "@/lib/cn";
import { commentsEnabled } from "@/lib/comments";
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
              {commentsEnabled && <CommentsLink pathname={pathname} />}
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

/**
 * 留言入口。刻意**不**放进 `navLinks` —— 那个数组被左侧主导航、主页移动端折叠菜单
 * 和文档侧栏抽屉三处共用，加进去会让「留言」同时出现在左边，正好违背把它单独放在
 * 右侧的意图。所以它硬编码在这里。
 *
 * 代价是移动端失去了菜单入口（不在 navLinks 里，菜单自然没有它），因此这个按钮
 * **不跟随** ThemeSwitch / GitHub 图标的 `max-md:hidden` —— 它在小屏上退化成纯图标
 * 继续留在顶栏，与同样退化为图标的 SearchTrigger 并排。留言是本次要建的主入口，
 * 藏进菜单就失去了意义。
 */
function CommentsLink({ pathname }: { pathname: string }) {
  const active = pathname === "/comments";

  return (
    <Link
      href="/comments"
      data-active={active}
      title="留言"
      className={cn(
        buttonVariants({ color: "ghost", size: "icon-sm" }),
        "shrink-0 gap-1.5 text-fd-muted-foreground transition-colors",
        "hover:text-fd-accent-foreground data-[active=true]:text-fd-primary",
        // 桌面端带文字，图标按钮的方形尺寸要放开；移动端只留图标。
        "md:w-auto md:px-2.5",
      )}
    >
      <MessageSquare className="size-4 shrink-0" aria-hidden />
      <span className="text-sm max-md:hidden">留言</span>
    </Link>
  );
}

/**
 * 社区论坛入口。占的是留言入口那个位置 —— 留言随主域迁到 EdgeOne 时整块下架
 * （lib/comments.ts 的 commentsEnabled 为 false），右侧这一格就空了出来。
 *
 * 两者短期内不会同时出现：真要恢复留言，得先决定它和论坛的分工，那时再排版。
 *
 * 为什么不写进 navLinks —— 那里已经有主题编辑器和主题市场两个兄弟站，看着像是
 * 论坛的天然去处。但 navLinks 会被左侧主导航、主页移动端折叠菜单和文档侧栏抽屉
 * 三处共用，而左侧已经八项，再加一项就要挤换行了。放右边还有一层用意：论坛是
 * 「有问题找人」的入口，和搜索挨着比夹在一串页面链接里更容易被想起来。
 *
 * 和 CommentsLink 一样**不跟随** ThemeSwitch / GitHub 图标的 `max-md:hidden` ——
 * 它不在 navLinks 里，移动端菜单自然没有它，只能在顶栏退化成纯图标继续留着，
 * 否则小屏上就彻底没有入口了。
 */
function ForumLink() {
  return (
    <Link
      href={forumUrl}
      external
      title="清风输入法社区"
      className={cn(
        buttonVariants({ color: "ghost", size: "icon-sm" }),
        "shrink-0 gap-1.5 text-fd-muted-foreground transition-colors",
        "hover:text-fd-accent-foreground",
        // 桌面端带文字，图标按钮的方形尺寸要放开；移动端只留图标。
        "md:w-auto md:px-2.5",
      )}
    >
      <MessagesSquare className="size-4 shrink-0" aria-hidden />
      <span className="text-sm max-md:hidden">社区</span>
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
