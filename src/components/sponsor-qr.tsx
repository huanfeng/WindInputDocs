"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "fumadocs-ui/components/ui/collapsible";
import { ChevronDown, QrCode } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { paymentMethods } from "@/lib/sponsor";

/**
 * 收款码区块。**默认展开**——赞助页是用户自己点进来的，翻到这里说明他已经决定
 * 要给了，再设一道「展开」就是白白挡一下。
 *
 * 早先默认折叠，理由是「赞助入口不该迎面扑来，让读者先看完原则与用途」。那个顾虑
 * 对**首页或文档页**的赞助入口成立，对赞助页本身不成立：能走到这一页的人已经越过
 * 了那层筛选。
 *
 * 仍然保留可收起：两张竖图在小屏上占掉整屏，读下方的备注说明时收掉更方便。
 *
 * 图片保留 loading="lazy"：区块在页面靠下，首屏之外的图仍然不会立刻请求。
 */
export function SponsorQr() {
  const [open, setOpen] = useState(true);
  // 加载失败的收款码 id。图片是构建期从源站拉进产物的（scripts/fetch-assets.mjs），
  // 源站当时不可达时构建不会失败、只是少了文件——那种构建里这些 img 会 404。
  // 与其留两个破图，不如整块收起，走与「尚未上传」相同的那句说明。
  const [failed, setFailed] = useState<string[]>([]);

  const available = paymentMethods.filter((m) => !failed.includes(m.id));

  // 收款码尚未上传，或产物里一张都没有（见 lib/sponsor.ts）：给出说明而不是渲染破图
  if (
    paymentMethods.length === 0 ||
    (failed.length > 0 && available.length === 0)
  ) {
    return (
      <p className="rounded-lg border border-dashed p-5 text-sm text-fd-muted-foreground">
        赞助渠道正在准备中，稍后开放。
      </p>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium",
          "transition-colors hover:bg-fd-accent/50",
        )}
      >
        <QrCode className="size-4 text-fd-primary" aria-hidden />
        {open ? "收起收款码" : "展开收款码"}
        <ChevronDown
          className={cn(
            "ms-auto size-4 text-fd-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* 收款码是竖图，且两家导出的比例还不一样（微信 ≈3:4、支付宝 2:3），
            所以约束高度、宽度自适应：并排时底边齐平，两张里的二维码绝对尺寸也
            相近，扫码体验一致。写死正方形会把图压变形。
            图上本就印着「微信支付」「支付宝」，不再另加图注，只保留 alt 供读屏软件 */}
        <div className="flex flex-wrap items-start justify-center gap-6 pt-4">
          {available.map((m) => (
            // 用原生 img 而非 next/image：站点已全局关闭图片优化
            // （next.config.mjs 的 images.unoptimized），next/image 在这里
            // 只剩尺寸声明的负担，没有收益
            // biome-ignore lint/performance/noImgElement: 见上方注释
            <img
              key={m.id}
              src={`/${m.key}`}
              alt={`${m.name}收款码`}
              loading="lazy"
              onError={() =>
                setFailed((prev) =>
                  prev.includes(m.id) ? prev : [...prev, m.id],
                )
              }
              className="h-80 w-auto rounded-lg border bg-white p-2 sm:h-96 lg:h-112"
            />
          ))}
        </div>
        {/* 备注说明放在收款码正下方而不是折叠面板外：它是「转账时怎么做」的操作
            提示，只在真要扫码的那一刻才有意义，折叠状态下显示反而是噪音 */}
        <p className="mt-4 rounded-lg bg-fd-muted/50 p-4 text-sm leading-relaxed text-fd-muted-foreground">
          转账时欢迎在
          <strong className="font-medium text-fd-foreground">备注</strong>
          里留下邮箱、QQ 号或昵称，方便作者记录。未留备注的一律按
          <strong className="font-medium text-fd-foreground">匿名赞助</strong>
          处理；事后想补充信息，也可以随时联系作者。
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
