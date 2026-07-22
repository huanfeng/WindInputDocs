import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";
import { appName, githubUrl, navLinks } from "./shared";

/**
 * 两个布局共享的基础配置。顶栏本身由 `SiteNavbar` 通过 `slots.header`
 * 接管（见 app/(home)/layout.tsx 与 app/docs/layout.tsx）；这里的
 * links / githubUrl 仍要传入，供文档侧栏的移动端抽屉渲染同一批链接。
 */
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
    links: navLinks,
    githubUrl,
  };
}
