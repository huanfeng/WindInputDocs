import { HomeLayout } from "fumadocs-ui/layouts/home";
import { HomeNavbar } from "@/components/site-navbar";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <HomeLayout {...baseOptions()} slots={{ header: HomeNavbar }}>
      {children}
    </HomeLayout>
  );
}
