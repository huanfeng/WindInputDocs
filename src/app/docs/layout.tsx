import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { DocsNavbar, SidebarCollapseButton } from "@/components/site-navbar";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

// 顶栏由 SiteNavbar 接管，与主页共用同一组件；nav.mode='top' 让侧栏让出顶栏行。
export default function Layout({ children }: LayoutProps<"/docs">) {
  const { nav, ...base } = baseOptions();
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...base}
      nav={{ ...nav, mode: "top" }}
      slots={{ header: DocsNavbar }}
      sidebar={{ banner: SidebarCollapseButton }}
    >
      {children}
    </DocsLayout>
  );
}
