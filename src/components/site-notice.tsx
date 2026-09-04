"use client";

import Link from "fumadocs-core/link";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Megaphone, X } from "lucide-react";
import {
  NOTICE_ATTR,
  NOTICE_KEY,
  NOTICE_SEEN_ATTR,
  NOTICE_SEEN_KEY,
} from "@/lib/bootstrap";
import { cn } from "@/lib/cn";
import { siteNotice } from "@/lib/notice";

/**
 * 全站公告胶囊，挂在顶栏右侧（见 site-navbar.tsx）。
 *
 * 选顶栏内嵌而不是顶部横幅：横幅要么吸顶、永久占掉每一页首屏的一行，要么随滚动
 * 走掉、等于没有。胶囊跟着顶栏走遍全站，却不给布局多要一个像素——顶栏那一行本来
 * 就在，它只是多占了一格。
 *
 * 「已读」与「不感兴趣」是两件事，分两个键存：
 *
 * - 点胶囊跳去论坛 = **已读**：未读红点不再闪，入口留着，还能再点回去看
 * - 点 ×           = **不感兴趣**：整枚胶囊消失
 *
 * 合成一件事的话，「读过」就被当成了「不想再看见」——扫一眼帖子回来，入口没了。
 * 窄屏放不下 × 按钮，因此只有已读这一档；但没了红点的灰图标也不算打扰。
 *
 * 两态的显隐都交给 CSS（global.css 按 `<html>` 上的标记判），组件因此不持状态：
 * 用 React state 的话，静态导出的每一页都要先渲染出红点、水合后再摘掉，闪那一下
 * 等于没记住。点击时直接写标记，CSS 立即响应。
 */
export function SiteNotice() {
  // 局部 const 而非直接用模块导出：早返回后 TS 的窄化才能延续进下面的闭包。
  const notice = siteNotice;
  if (!notice) return null;

  /** 记下一个状态：写 localStorage（供下次进站判定）+ 写 `<html>` 标记（本次立即生效）。 */
  const mark = (key: string, attr: string) => () => {
    try {
      localStorage.setItem(key, notice.id);
    } catch {
      // 隐私模式下写不进去，标记仍然生效到本次会话结束
    }
    document.documentElement.setAttribute(attr, "1");
  };

  return (
    <div id="site-notice" className="flex shrink-0 items-center">
      <Link
        href={notice.href}
        external
        title={notice.title}
        onClick={mark(NOTICE_SEEN_KEY, NOTICE_SEEN_ATTR)}
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
      <button
        type="button"
        onClick={mark(NOTICE_KEY, NOTICE_ATTR)}
        aria-label="不再提示"
        title="不再提示"
        className={cn(
          buttonVariants({ color: "ghost", size: "icon-sm" }),
          "-ms-1 size-6 shrink-0 text-fd-muted-foreground/50 transition-colors",
          "hover:text-fd-muted-foreground max-lg:hidden",
        )}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
