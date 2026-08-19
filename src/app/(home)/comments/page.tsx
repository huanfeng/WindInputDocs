import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommentsOverview } from "@/components/comments-overview";
import { commentsEnabled } from "@/lib/comments";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: "留言",
  description: "清风输入法的留言板，也汇总各文档页的留言",
};

export default function CommentsPage() {
  // 构建期总开关关掉时这条路由直接 404，与顶栏入口的消失保持一致 ——
  // 留一个空页面在那儿，等于留下一个「功能坏了」的印象。
  if (!commentsEnabled) notFound();

  // 构建期烘焙 { page.url -> 标题 } 映射。
  //
  // 这是本页最关键的一处设计：评论 Worker 只存 page_id（即 /docs/... 这样的 URL），
  // 不知道文档标题。与其让 Worker 冗余存一份会过期的标题，不如让前端在构建期解析 ——
  // 这里是 Server Component，source.getPages() 直接可用，标题改了下次构建自动跟上，
  // 两边零耦合。
  //
  // 静态导出下这个对象会被序列化进 HTML 传给客户端组件。四十来篇文档，几 KB 而已。
  const titles: Record<string, string> = {};
  for (const page of source.getPages()) {
    titles[page.url] = page.data.title;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight">留言</h1>
      <p className="mt-3 text-fd-muted-foreground">
        有什么想说的，欢迎在这里留言。各文档页下方的留言也会汇总到这里。
      </p>

      <CommentsOverview titles={titles} />
    </main>
  );
}
