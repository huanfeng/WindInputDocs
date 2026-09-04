"use client";

import Link from "fumadocs-core/link";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Megaphone } from "lucide-react";
import { NOTICE_SEEN_ATTR, NOTICE_SEEN_KEY } from "@/lib/bootstrap";
import { cn } from "@/lib/cn";
import { siteNotice } from "@/lib/notice";

/**
 * 全站公告胶囊，挂在顶栏右侧（见 site-navbar.tsx）。
 *
 * 选顶栏内嵌而不是顶部横幅：横幅要么吸顶、永久占掉每一页首屏的一行，要么随滚动
 * 走掉、等于没有。胶囊跟着顶栏走遍全站，却不给布局多要一个像素——顶栏那一行本来
 * 就在，它只是多占了一格。
 *
 * 只有「已读」一档，没有关闭按钮：点进去看过之后未读红点不再闪，入口留着还能再点。
 * 一枚不闪的灰图标不值得为它多摆一个 ×——那个 × 在窄屏还放不下，反而要多解释一次
 * 「为什么手机上关不掉」。公告本身要下线，把 lib/notice.ts 的 siteNotice 改成 null。
 *
 * 红点的显隐交给 CSS（global.css 按 `<html>` 上的标记判），组件因此不持状态：
 * 用 React state 的话，静态导出的每一页都要先渲染出红点、水合后再摘掉，闪那一下
 * 等于没记住。点击时直接写标记，CSS 立即响应。
 */
export function SiteNotice() {
  // 局部 const 而非直接用模块导出：早返回后 TS 的窄化才能延续进下面的闭包。
  const notice = siteNotice;
  if (!notice) return null;

  /** 记下已读：写 localStorage（供下次进站判定）+ 写 `<html>` 标记（本次立即生效）。 */
  const markSeen = () => {
    try {
      localStorage.setItem(NOTICE_SEEN_KEY, notice.id);
    } catch {
      // 隐私模式下写不进去，标记仍然生效到本次会话结束
    }
    document.documentElement.setAttribute(NOTICE_SEEN_ATTR, "1");
  };

  return (
    <Link
      id="site-notice"
      href={notice.href}
      external
      title={notice.title}
      onClick={markSeen}
      className={cn(
        buttonVariants({ color: "ghost", size: "icon-sm" }),
        "shrink-0 gap-1.5 text-fd-muted-foreground transition-colors",
        "hover:text-fd-accent-foreground",
        // lg 起带文字（此断点以下左侧主导航也已收进菜单，横向本就吃紧）
        "lg:w-auto lg:px-2.5",
      )}
    >
      <span className="relative flex shrink-0">
        <Megaphone className="size-4" aria-hidden />
        {/* 未读红点，读过之后由 CSS 摘掉。ping 只在 motion-safe 下跑——一个永不
            停歇的动画对 prefers-reduced-motion 的人是干扰，静止的点一样能标出
            「有新东西」 */}
        <span
          data-notice-dot
          className="absolute -end-0.5 -top-0.5 flex size-1.5"
        >
          <span className="absolute inline-flex size-full rounded-full bg-fd-primary opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex size-full rounded-full bg-fd-primary" />
        </span>
      </span>
      <span className="text-sm max-lg:hidden">{notice.label}</span>
    </Link>
  );
}
