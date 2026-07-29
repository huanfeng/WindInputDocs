import { Sparkles } from "lucide-react";

/**
 * 版本徽章：标注某项功能自哪个版本起可用。
 *
 * 挂在功能小节标题后面，让读者一眼判断「我装的版本有没有这个」——
 * 比在正文里补一句「0.113 新增」更容易扫到，也不打断段落节奏。
 *
 * ```mdx
 * ## 直达指定方案与类型 <Since v="0.113" />
 * ```
 *
 * 标题是粗体大字，徽章必须显式把字号/字重压回 xs，否则会跟着标题一起放大；
 * `align-middle` 让它与标题文字居中对齐，而不是贴着顶线。
 *
 * 侧栏目录复用同一份标题节点渲染，徽章会跟着进去把窄栏目录挤到换行，
 * 故用 `[#nd-toc_&]:hidden` 只在目录树内隐藏——正文标题照常显示。
 */
export function Since({ v }: { v: string }) {
  return (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded-full border border-fd-primary/25 bg-fd-primary/10 px-2 py-0.5 align-middle text-xs font-medium text-fd-primary [#nd-toc_&]:hidden"
      title={`自 ${v} 版本起可用`}
    >
      <Sparkles className="size-3" aria-hidden />
      {v} 新增
    </span>
  );
}
