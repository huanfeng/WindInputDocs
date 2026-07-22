import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

// notebook 布局 + nav.mode='top'：文档页与主页共用同一常驻顶栏
export default function Layout({ children }: LayoutProps<"/docs">) {
  const { nav, ...base } = baseOptions();
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...base}
      nav={{ ...nav, mode: "top" }}
    >
      {children}
    </DocsLayout>
  );
}
