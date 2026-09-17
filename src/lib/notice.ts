/**
 * 全站公告的**唯一数据源**。渲染它的是顶栏右侧那枚小胶囊，
 * 见 components/site-notice.tsx。
 *
 * 换一条公告：连 `id` 一起换。关闭状态是按 id 记在 localStorage 里的，
 * 沿用旧 id 等于宣布「这条大家都已经看过」——之前点过 × 的人再也收不到新的一条。
 *
 * 下线：把 `siteNotice` 改成 `null`，整枚胶囊连同顶栏那一格一起消失，
 * 不必去动组件或样式。
 */
export interface SiteNotice {
  /** 关闭状态的存储值。换公告必须换，理由见上 */
  id: string;
  /** 胶囊上的文字，桌面端显示。控制在 8 个汉字以内——再长会挤掉顶栏的搜索框 */
  label: string;
  /** 悬停提示与窄屏下的无障碍名称。窄屏只剩一个图标，全部信息都靠它，别省 */
  title: string;
  href: string;
}

/**
 * 当前没有在挂的公告。要发一条，照着这个形状填回来即可：
 *
 *     export const siteNotice: SiteNotice | null = {
 *       id: "some-topic-2026-09",
 *       label: "八个汉字以内",
 *       title: "悬停提示，把话说完",
 *       href: "https://example.com/d/1",
 *     };
 */
export const siteNotice: SiteNotice | null = null;
