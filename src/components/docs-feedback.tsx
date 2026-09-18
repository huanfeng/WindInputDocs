import { docsFeedbackUrl } from "@/lib/shared";

/**
 * 文档页底部的反馈引导。
 *
 * 取代原先的每页评论区（直连 Flarum 的 FlarumComments）：那套「一篇文档一个主题」
 * 的同步机制要靠一张构建期映射表跟着文档路径一起维护（改个路径就得手工改键，
 * 否则旧评论变孤儿），而它承载的讨论量撑不起这份成本 —— 同步出来的四十来个主题
 * 里绝大多数一直是空的。
 *
 * 现在统一引到文档仓的 issue 列表：反馈集中在一处，能被搜到，和文档改动同仓，
 * 修完能直接引用关掉，也不必每页一问。
 *
 * 纯静态，没有 fetch 也没有登录态判断，目标站点不可达时这块照常显示 ——
 * 它只是一个链接，不承诺内容。
 */
export function DocsFeedback() {
  return (
    <section className="mt-12 border-fd-border border-t pt-8">
      <div className="flex flex-col gap-3 rounded-lg border bg-fd-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">对这篇文档有疑问，或发现内容有误？</p>
          <p className="mt-1 text-fd-muted-foreground">
            欢迎到文档仓库提 issue，写明问题时附上本页链接即可。
          </p>
        </div>
        {/* 新标签页打开：读文档的人多半还要接着往下读，不该被顶掉当前页 */}
        <a
          href={docsFeedbackUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md bg-fd-primary px-4 py-1.5 text-center font-medium text-fd-primary-foreground text-sm hover:opacity-90"
        >
          去提 issue →
        </a>
      </div>
    </section>
  );
}
