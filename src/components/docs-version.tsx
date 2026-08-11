import { CircleArrowUp } from "lucide-react";
import Link from "next/link";
import { currentVersion } from "@/lib/releases";

/**
 * 文档版本徽章：声明「这份文档跟着最新版走」。
 *
 * 站内已有 `Since` 徽章标注单个功能的起始版本，但那是逐条手工挂的——只覆盖作者
 * 记得标注的地方，且默认读者已经知道「版本会影响功能」。本徽章补的是那条总括前提：
 * 读者找不到文中描述的功能时，第一反应该是「我该升级」，而不是「我配错了」。
 *
 * 版本号取自 `lib/releases` 的 `currentVersion`，由 CI 在主仓发布 Release 时写入
 * data/releases.json，因此这里零维护，不会出现文案与实际版本漂移。
 *
 * 做成指向下载页的链接而非纯文字：看到提示的人下一步就是去升级，少一次找入口。
 * 窄屏隐去「文档基于」四字只留版本号——那一行还并排着复制与视图两个按钮，
 * 全文案会把它们挤到换行。
 */
export function DocsVersion() {
  return (
    <Link
      href="/download"
      title={`本文档基于 v${currentVersion} 编写。功能持续变化，更早的版本可能没有文中描述的功能或选项——遇到对不上的地方，请先升级到最新版本。`}
      className="ms-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground"
    >
      <CircleArrowUp className="size-3.5" aria-hidden />
      <span className="hidden sm:inline">文档基于 </span>v{currentVersion}
    </Link>
  );
}
