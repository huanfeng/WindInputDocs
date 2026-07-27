"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "fumadocs-ui/components/ui/collapsible";
import { ChevronDown, QrCode } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { r2Base } from "@/lib/releases";
import { paymentMethods } from "@/lib/sponsor";

/**
 * 收款码区块。默认折叠，点击才展开——赞助入口不该在页面里迎面扑来，
 * 让读者先看完上面的原则与用途，再自己决定是否点开。
 *
 * 折叠还有一个实际好处：收款码图片带 loading="lazy"，未展开时不会产生请求。
 */
export function SponsorQr() {
  const [open, setOpen] = useState(false);

  // 收款码尚未上传（见 lib/sponsor.ts）：给出说明而不是渲染破图
  if (paymentMethods.length === 0) {
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
          {paymentMethods.map((m) => (
            // 用原生 img 而非 next/image：站点已全局关闭图片优化
            // （next.config.mjs 的 images.unoptimized），图片又托管在 R2 上，
            // next/image 在这里只剩尺寸声明的负担，没有收益
            // biome-ignore lint/performance/noImgElement: 见上方注释
            <img
              key={m.id}
              src={`${r2Base}/${m.key}`}
              alt={`${m.name}收款码`}
              loading="lazy"
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
