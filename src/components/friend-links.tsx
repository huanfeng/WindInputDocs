import { friendLinks } from "@/lib/friend-links";

/**
 * 主页末尾的友情链接。
 *
 * 一行纯文字，没有图标也没有简介 —— 友链是给人顺手点开的，不是主页要推销的内容。
 * 版式照搬「内置方案」那个区块：一个说明标签加一排内联项。这个形态还有个好处，
 * 只有一条时也不显空，不必像卡片网格那样为条数少专门调列宽。
 *
 * 没有友链时返回 null，整块连标题一起不渲染 —— 友链是会长期为空、也可能哪天清空
 * 的东西，让它空着就彻底不存在，比留一个标题配一片空白诚实。
 *
 * 背景比上方的「支持项目」淡：那一块是 bg-fd-card/50，这里若照抄，两块同色叠在
 * 一起只剩中间一条线，看着像一块被切开的区域。留白让它自然退成页脚条。
 */
export function FriendLinks() {
  if (friendLinks.length === 0) return null;

  return (
    <section className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-6">
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
    </section>
  );
}
