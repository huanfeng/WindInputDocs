import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";
import { appName, mainRepo } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image
            src="/logo.png"
            alt=""
            width={22}
            height={22}
            className="rounded-[5px]"
          />
          {appName}
        </>
      ),
    },
    links: [
      { text: "主页", url: "/", active: "url" },
      { text: "文档", url: "/docs", active: "nested-url" },
      { text: "下载", url: "/download", active: "url" },
      { text: "更新记录", url: "/changelog", active: "url" },
      {
        text: "主题编辑器",
        url: "https://theme.windinput.com",
        external: true,
      },
      { text: "主题市场", url: "https://market.windinput.com", external: true },
    ],
    // 顶栏 GitHub 图标指向主程序仓库
    githubUrl: `https://github.com/${mainRepo.user}/${mainRepo.repo}`,
  };
}
