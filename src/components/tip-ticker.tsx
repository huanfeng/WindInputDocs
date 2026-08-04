"use client";

import { ChevronRight, Heart, Lightbulb } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { type Tip, tips } from "@/lib/tips";

/** 自动切换间隔。一行中文约 40 字，读完加上「要不要点进去」的犹豫，8 秒偏紧、10 秒有点拖 */
const INTERVAL = 9000;

/** 赞助条允许出现的最靠前与最靠后的位次（0 是首帧占位，轮不到它） */
const SPONSOR_MIN_SLOT = 1;
const SPONSOR_MAX_SLOT = 4;

/**
 * 生成播放顺序（下标序列）。两条硬约束：
 *
 * 1. **首位固定是 tips[0]**，不参与洗牌。静态导出的 HTML 因此有一份确定的首帧，
 *    客户端接手时不会 hydration 不一致，也不会先闪一条再换成另一条。
 * 2. **赞助条落在第 2～5 位之间**。不占门面——进来第一眼是产品本身；但只要多停
 *    留一会儿（一次轮播 9 秒）就必然经过它一次，不必靠钉死首位来换曝光。
 */
function shuffledOrder(): number[] {
  const sponsorAt = tips.findIndex((t) => t.sponsor);
  // 首帧占位与赞助都另有安排，先把剩下的洗匀
  const rest = tips.map((_, i) => i).filter((i) => i !== 0 && i !== sponsorAt);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  // sponsorAt < 0：没有标 sponsor 的条目（比如日后删掉了赞助条），别把 -1 塞进序列。
  // sponsorAt === 0：赞助被放在了首帧占位位置。此时它已经在返回值的首位了，再 splice
  // 一次会让它重复出现、序列多出一条——直接返回，视作「作者要它打头」。
  if (sponsorAt <= 0) return [0, ...rest];

  const span = SPONSOR_MAX_SLOT - SPONSOR_MIN_SLOT + 1;
  const slot = SPONSOR_MIN_SLOT + Math.floor(Math.random() * span);
  rest.splice(slot - 1, 0, sponsorAt); // rest 的第 slot-1 位 = 整个序列的第 slot 位
  return [0, ...rest];
}

interface Token {
  /** 该片段在原串中的起始偏移，天然唯一且稳定，作 key 比数组下标更贴切 */
  at: number;
  code: boolean;
  value: string;
}

/**
 * 把 text 按反引号切成普通文字与代码片段。
 *
 * 用标记而非 JSX，是为了让 tips 保持纯数据：一条技巧就是一个字符串，
 * 加内容不需要碰组件，也不必把数据文件变成 .tsx。
 * 奇数段即被反引号包住的部分——split 的结果必然是「文字/代码/文字…」交替。
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let at = 0;
  for (const [i, value] of text.split("`").entries()) {
    tokens.push({ at, code: i % 2 === 1, value });
    at += value.length + 1; // +1 补回被 split 吃掉的那个反引号
  }
  return tokens;
}

/**
 * 技巧轮播条。随机展示产品特色，可手动看下一条。
 *
 * 三条行为约定：
 * - **首帧固定是 tips[0] 这条技巧**，客户端 mount 后才洗牌（见 shuffledOrder）
 * - 鼠标悬停或键盘聚焦时暂停，免得正读着就被换走、正要点链接却跳了内容
 * - 尊重 prefers-reduced-motion：该偏好下不自动轮播，只保留「下一条」按钮
 *
 * 条目高度随文案变，所以稳定高度靠的是把文案本身控制在一行以内（见 tips.ts
 * 的 36 字约定）：桌面端实测 13 条恒为 64px，窄屏则统一折成两行。
 */
export function TipTicker({ className }: { className?: string }) {
  const [order, setOrder] = useState<number[]>(() => tips.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [paused, setPaused] = useState(false);

  // mount 后才随机——服务端没有稳定的随机源，且静态导出只渲染一次。
  useEffect(() => {
    setOrder(shuffledOrder());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoplay(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // 依赖 pos，因此手动点「下一条」会自然重置计时，不会刚点完就又被自动切走。
  // biome-ignore lint/correctness/useExhaustiveDependencies: pos 不被读取，只用来在切换后重建定时器
  useEffect(() => {
    if (!autoplay || paused) return;
    const id = setTimeout(() => setPos((p) => p + 1), INTERVAL);
    return () => clearTimeout(id);
  }, [pos, autoplay, paused]);

  const next = useCallback(() => setPos((p) => p + 1), []);

  // pos 单调递增、取模索引：不必在切换时回绕改状态，逻辑最少。
  const tip: Tip = tips[order[pos % order.length]];
  const Icon = tip.sponsor ? Heart : Lightbulb;

  return (
    // role/aria-label 让它成为一个可命名的区域，屏幕阅读器能整块跳过或进入；
    // 刻意不加 aria-live——自动轮播的内容若持续播报，会不停打断正在读别处的人。
    <section
      aria-label="使用技巧"
      className={cn(
        "flex min-h-16 flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-fd-card/50 px-4 py-3 sm:px-5",
        tip.sponsor && "border-fd-primary/30 bg-fd-primary/5",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon
        className={cn(
          "size-5 shrink-0 text-fd-primary",
          tip.sponsor && "fill-fd-primary/20",
        )}
        aria-hidden
      />
      {/* key 换掉整块以触发淡入：内容是整条替换的，做逐字过渡没有意义。
          不加 line-clamp——截断技巧正文等于把话说一半，宁可让它多占一行 */}
      <p
        key={pos}
        className="tip-enter min-w-0 flex-1 text-sm leading-relaxed text-fd-muted-foreground"
      >
        {tokenize(tip.text).map((t) =>
          t.code ? (
            <code
              key={t.at}
              className="mx-0.5 rounded bg-fd-muted px-1 py-0.5 font-mono text-[0.85em] text-fd-foreground"
            >
              {t.value}
            </code>
          ) : (
            <span key={t.at}>{t.value}</span>
          ),
        )}
      </p>
      {/* 窄屏 w-full 把这一组挤到第二行，正文才拿得到整行宽度——否则它作为
          flex-1 会一路收缩到放不下，文字被压成三四行。sm 起恢复同行右对齐 */}
      <div className="ms-auto flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
        <Link
          href={tip.href}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-fd-primary transition-colors hover:bg-fd-primary/10"
        >
          {tip.cta} →
        </Link>
        <button
          type="button"
          onClick={next}
          aria-label="下一条技巧"
          title="下一条"
          className="rounded-full border p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
