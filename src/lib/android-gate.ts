// 安卓版的「对外开关」。
//
// 安卓版还在预发布，文档与下载入口先备好，但**不对外显示**，确认正式发布时再打开。
// 开关是构建环境变量 `SHOW_ANDROID=1`（EdgeOne 项目的环境变量里设；本地 `SHOW_ANDROID=1 pnpm build`）。
//
// 没开时（默认）：
//   - 安卓文档页（见 ANDROID_DOC_PREFIXES）按「整页未发布」处理——侧栏、站点地图、搜索、llms.txt
//     全部摘掉，页面本身裹进隐藏容器并 noindex（走 lib/source.ts 的 unreleasedPages 同一条路）；
//   - 下载页的安卓卡片挂 data-unreleased，CSS 默认藏起来；
//   - 但 `?preview=1`（见 lib/bootstrap.ts）打开后都看得到，拿链接直接给人预览用。
//
// 打开后上面的隐藏全部解除，不需要回头改任何内容。
//
// 不放进 lib/releases.ts：那里按 releases.json（电脑版版本）判断未发布，安卓版有自己的版本号，
// 两套版本不能混判。
//
// 只读 process.env，不引 node 模块：下载页（服务端组件）与 source.ts 都要用。

/** 构建时是否对外开放安卓版。 */
export const androidPublic = process.env.SHOW_ANDROID === "1";

/** 安卓文档页的 url 前缀。今后升级成独立板块（content/docs/android/）也在这里。 */
export const ANDROID_DOC_PREFIXES = [
  "/docs/reference/android",
  "/docs/android",
] as const;

/** 这个文档 url 是否属于安卓版文档。 */
export function isAndroidDocUrl(url: string): boolean {
  return ANDROID_DOC_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`));
}
