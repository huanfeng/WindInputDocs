"use client";

import Link from "fumadocs-core/link";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NOTICE_ATTR, NOTICE_KEY } from "@/lib/bootstrap";
import { cn } from "@/lib/cn";
import { siteNotice } from "@/lib/notice";

/**
 * 全站公告胶囊，挂在顶栏右侧（见 site-navbar.tsx）。
 *
 * 选顶栏内嵌而不是顶部横幅：横幅要么吸顶、永久占掉每一页首屏的一行，要么随滚动
 * 走掉、等于没有。胶囊跟着顶栏走遍全站，却不给布局多要一个像素——顶栏那一行本来
 * 就在，它只是多占了一格。
 *
 * 两种关闭方式，都写同一个键：
 * - 点 ×：明确表示不感兴趣（窄屏没有这个按钮，横向放不下）
 * - 点胶囊本身跳去论坛：目的已经达成，不必再提示第二次
 */
export function SiteNotice() {
  // 局部 const 而非直接用模块导出：早返回后 TS 的窄化才能延续进下面的闭包。
  const notice = siteNotice;
  const [dismissed, setDismissed] = useState(false);

  // 读 bootstrap（lib/bootstrap.ts）留在 <html> 上的标记，而不是再读一次
  // localStorage：那段脚本是唯一的判定处，两边各判一次迟早出现只有一边认账的状态。
  useEffect(() => {
    setDismissed(document.documentElement.hasAttribute(NOTICE_ATTR));
  }, []);

  if (!notice || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(NOTICE_KEY, notice.id);
    } catch {
      // 隐私模式下写不进去，关闭仍然生效到本次会话结束
    }
    document.documentElement.setAttribute(NOTICE_ATTR, "1");
    setDismissed(true);
  };

  return (
    <div id="site-notice" className="flex shrink-0 items-center">
      <Link
        href={notice.href}
        external
        title={notice.title}
        onClick={dismiss}
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
          {/* 未读红点。ping 只在 motion-safe 下跑——一个永不停歇的动画对
              prefers-reduced-motion 的人是干扰，静止的点一样能标出「有新东西」 */}
          <span className="absolute -end-0.5 -top-0.5 flex size-1.5">
            <span className="absolute inline-flex size-full rounded-full bg-fd-primary opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-full rounded-full bg-fd-primary" />
          </span>
        </span>
        <span className="text-sm max-lg:hidden">{notice.label}</span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
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
