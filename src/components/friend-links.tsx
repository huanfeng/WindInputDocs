import { friendLinks } from "@/lib/friend-links";

/**
 * 页脚里的友情链接，一行纯文字。
 *
 * 只输出行内内容，容器由 SiteFooter 给 —— 友链与备案号同处一行，左右分列，
 * 谁也不该自带边框和内边距，否则两者拼不成一条完整的页脚。
 *
 * 没有图标也没有简介：友链是给人顺手点开的，不是主页要推销的内容。曾经做过
 * 卡片版（带首字色块与一句话简介），撤掉了 —— 它排在页面最末，不该比正文区块
 * 更抢眼。
 *
 * 没有友链时返回 null，连「友情链接」这个标签一起不渲染 —— 友链是会长期为空、
 * 也可能哪天清空的东西，让它空着就彻底不存在，比留一个标题配一片空白诚实。
 * 页脚那一行不会因此消失，备案号还在，只是左边空出来。
 */
export function FriendLinks() {
  if (friendLinks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <span className="text-sm text-fd-muted-foreground">友情链接</span>
      {friendLinks.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          /*
           * noopener 挡的是被打开页通过 window.opener 反向操纵本页（钓鱼跳转）；
           * noreferrer 顺带不把来源地址告诉对方。友链是外部站点，两个都给上。
           */
          rel="noopener noreferrer"
          className="text-sm transition-colors hover:text-fd-primary"
        >
          {link.name}
        </a>
      ))}
    </div>
  );
}
