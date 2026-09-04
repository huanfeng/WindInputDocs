"use client";

import { EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { PREVIEW_ATTR, PREVIEW_KEY } from "@/lib/bootstrap";

/**
 * 预览模式的浮标。
 *
 * 开关记在 localStorage 里，开过就一直生效——没有这条提示，几周后再来看文档的人
 * 会把未发布的功能当成现有功能，比一开始就藏起来更糟。所以它常驻，并给一个一键退出。
 *
 * 用右下角浮层而不是顶部横幅：站点顶栏自己就是 sticky，横幅吸在同一位置会跟它抢
 * 首屏那一行；浮层不参与文档的栅格布局，开着预览也不会让页面看起来跟正式版不一样。
 */
export function PreviewBanner() {
  const [active, setActive] = useState(false);

  // 读的是 bootstrap 脚本在 <html> 上留下的标记，而不是再读一次 localStorage：
  // 那段脚本是唯一的判定处，两边各判一次迟早会出现只有一边认账的状态。
  useEffect(() => {
    setActive(document.documentElement.hasAttribute(PREVIEW_ATTR));
  }, []);

  if (!active) return null;

  const exit = () => {
    try {
      localStorage.setItem(PREVIEW_KEY, "0");
    } catch {
      // 隐私模式下写不进去，退出仍然生效到本次会话结束
    }
    document.documentElement.removeAttribute(PREVIEW_ATTR);
    setActive(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-fd-primary py-1.5 pl-3.5 pr-1.5 text-xs text-fd-primary-foreground shadow-lg">
      <span>预览模式：含尚未发布的功能</span>
      <button
        type="button"
        onClick={exit}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/15 px-2 py-0.5 font-medium transition-colors hover:bg-black/25"
      >
        <EyeOff className="size-3" aria-hidden />
        退出
      </button>
    </div>
  );
}
