import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import { appName, siteUrl } from "@/lib/shared";
import "./global.css";

export const metadata: Metadata = {
  // 静态导出没有请求上下文，不设 metadataBase 会把 OG 图地址写成 http://localhost:3000
  metadataBase: new URL(siteUrl),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description:
    "轻量、快速、可定制的开源中文输入法，支持五笔、全拼、双拼及混合输入",
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
