"use client";

import { EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

/** URL 参数与 localStorage 键，两处必须与 previewBootstrap 里的字面量一致。 */
const PARAM = "preview";
const STORAGE_KEY = "wi-preview";

/**
 * 预览模式的开关脚本，注入到 `<head>` 里同步执行。
 *
 * 必须同步、且必须在 body 之前：晚一步执行，未发布的内容就会先渲染出来再被藏掉，
 * 闪那一下等于没藏。所以这里是一段裸字符串而不是 React 组件——组件最早也要等到
 * 水合，来不及。
 *
 * `?preview=1` 开启并记住，`?preview=0` 关闭并忘掉；开过之后不带参数也保持开启，
 * 免得每次翻页都要重新加参数。
 */
export const previewBootstrap = `
try {
  var p = new URLSearchParams(location.search).get("${PARAM}");
  if (p === "1" || p === "0") localStorage.setItem("${STORAGE_KEY}", p);
  if (localStorage.getItem("${STORAGE_KEY}") === "1")
    document.documentElement.setAttribute("data-preview", "1");
} catch (e) {}
`;

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
    setActive(document.documentElement.hasAttribute("data-preview"));
  }, []);

  if (!active) return null;

  const exit = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "0");
    } catch {
      // 隐私模式下写不进去，退出仍然生效到本次会话结束
    }
    document.documentElement.removeAttribute("data-preview");
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
