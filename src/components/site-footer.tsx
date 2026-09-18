import { FriendLinks } from "@/components/friend-links";

/**
 * 页脚。一行放两样东西：左边友情链接，右边 ICP 备案号。
 *
 * 合成一行而不是各占一条：两者都是「正文结束之后的落款」，各自拉一条横线会把
 * 页面末尾切成两截细条，视觉上比它们本身的分量重得多。
 *
 * 备案号靠 `ms-auto` 推到右端 —— 友链为空时那一段整个不渲染，这一行只剩备案号，
 * 仍旧停在右边，位置不会因为友链的增删而跳。
 *
 * 备案号必须链到 beian.miit.gov.cn 供核验，只写一行文字不算数。字号比友链再小
 * 一档：页面的信息到友链就结束了，它只是落款。
 */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-6">
        <FriendLinks />
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          /* 与友链同理：noopener 挡 window.opener 反向操纵，noreferrer 不带来源 */
          rel="noopener noreferrer"
          className="ms-auto text-xs text-fd-muted-foreground transition-colors hover:text-fd-primary"
        >
          粤ICP备2026141259号-1
        </a>
      </div>
    </footer>
  );
}
