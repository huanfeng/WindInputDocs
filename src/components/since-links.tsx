import { BookOpen } from "lucide-react";
import Link from "next/link";
import type { SinceEntry } from "@/lib/since-index";

/**
 * 更新记录里的「本版相关文档」区块。
 *
 * 更新条目是从主仓 Release 同步来的纯文本（同步脚本会剥掉行内链接，见
 * scripts/sync_release_notes.py），一句「增加词语联想功能」说完就完了，读者还得
 * 自己去文档里翻这功能在哪个设置页。这里把文档中 `<Since>` 标注的同版本小节直接
 * 列出来，补上从「有什么新功能」到「在哪配」的那一跳。
 *
 * 条目由 lib/since-index 在构建期扫描 MDX 得到，写文档时标 `<Since>` 是既有习惯，
 * 因此这块内容零额外维护——发版时不需要再手工补一份映射表。
 */
export function SinceLinks({ entries }: { entries: SinceEntry[] }) {
  // 0.113 之前的版本没有 `<Since>` 覆盖，整块不渲染，不留空标题
  if (entries.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border bg-fd-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-fd-foreground">
        <BookOpen className="size-3.5 text-fd-primary" aria-hidden />
        本版相关文档
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.url}>
            <Link
              href={entry.url}
              className="inline-flex rounded-full border px-2.5 py-1 text-xs text-fd-muted-foreground transition-colors hover:border-fd-primary/40 hover:bg-fd-primary/10 hover:text-fd-primary"
            >
              {entry.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
