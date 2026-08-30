import { ArrowUpRight } from "lucide-react";
import { type FriendLink, friendLinks } from "@/lib/friend-links";

/**
 * 主页末尾的友情链接区块。
 *
 * 没有友链时返回 null —— 整个 section 连同标题一起不渲染。友链是会长期为空、
 * 也可能哪天清空的东西，让它在空的时候彻底消失，比留一个空标题诚实。
 *
 * 版式跟着主页既有区块走：外层 border-t + bg-fd-card/50 与「支持项目」同源，
 * 卡片沿用「特性」那一组的 rounded-lg border p-5 hover:bg-fd-accent/50。
 * 不为这一块单独发明样式 —— 它在页面最末，不该比正文区块更抢眼。
 */
export function FriendLinks() {
  if (friendLinks.length === 0) return null;

  return (
    <section className="border-t bg-fd-card/50">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">友情链接</h2>
          <p className="text-sm text-fd-muted-foreground">
            以下站点与本项目无隶属关系
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {friendLinks.map((link) => (
            <li key={link.url}>
              <FriendCard link={link} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FriendCard({ link }: { link: FriendLink }) {
  const hue = hueOf(link.name);

  return (
    <a
      href={link.url}
      target="_blank"
      /*
       * noopener 挡的是被打开页通过 window.opener 反向操纵本页（钓鱼跳转）；
       * noreferrer 顺带不把来源地址告诉对方。友链是外部站点，两个都给上。
       */
      rel="noopener noreferrer"
      className="group flex h-full items-start gap-3 rounded-lg border p-5 transition-colors hover:bg-fd-accent/50"
    >
      <span
        aria-hidden
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
        /*
         * 色相由站名算出，饱和度和亮度写死 —— 只让色相变，深浅一致，
         * 一排卡片摆在一起才像一套东西，而不是一堆各自为政的色块。
         * 亮度 42% 在浅色与暗色两套主题下都压得住白字。
         */
        style={{ background: `hsl(${hue} 55% 42%)` }}
      >
        {firstChar(link.name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 font-medium">
          <span className="truncate">{link.name}</span>
          <ArrowUpRight
            className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70"
            aria-hidden
          />
        </span>
        {link.desc && (
          <span className="mt-1 block text-sm leading-relaxed text-fd-muted-foreground">
            {link.desc}
          </span>
        )}
      </span>
    </a>
  );
}

/**
 * 取站名的第一个字符做标识。
 *
 * 用展开运算符而不是 name[0]：JS 的字符串下标按 UTF-16 码元取，遇到 emoji 或
 * 生僻字这类占两个码元的字符会截出半个，渲染成 �。展开运算符按码点迭代。
 */
function firstChar(name: string): string {
  return [...name][0] ?? "?";
}

/**
 * 从站名派生一个稳定的色相。
 *
 * 同一个名字永远同一个颜色，加友链时不用操心配色，也不会因为数组顺序变了
 * 导致满页颜色重排。
 *
 * 用 FNV-1a 而不是常见的 djb2（h * 33 + c）。djb2 在这里会塌掉：33 与 360
 * 的最大公约数是 3，`h * 33 % 360` 把结果锁死在少数几个剩余类里，而中文站名
 * 的码点又集中在同一段 —— 实测四个中文名字算出 210/195/196/169，全挤在蓝青
 * 一带，等于没有区分。FNV-1a 的异或加乘配上 2^32 取模没有这个退化。
 *
 * Math.imul 是必须的：JS 的 * 会把大整数转成双精度浮点，超过 2^53 就丢低位，
 * 而哈希恰恰全靠低位。imul 做的是真正的 32 位整数乘法。
 */
function hueOf(name: string): number {
  let h = 2166136261;
  for (const ch of name) {
    // ?? 0 只是为了满足类型：for...of 按码点迭代，codePointAt(0) 必有值
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  // >>> 0 转成无符号：imul 的结果是有符号的，负数取模会得到负色相
  return (h >>> 0) % 360;
}
