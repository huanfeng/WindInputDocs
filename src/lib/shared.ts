import type { LinkItemType } from "fumadocs-ui/layouts/shared";

export const appName = "清风输入法";
// 站点正式地址（Cloudflare Pages 项目 windinput-docs 绑定的域名），sitemap/robots 用
export const siteUrl = "https://windinput.com";
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";
export const docsContentRoute = "/llms.mdx/docs";

// 主程序仓库（下载/发布页所在）
export const mainRepo = {
  user: "huanfeng",
  repo: "WindInput",
};

// 文档站自身仓库（「在 GitHub 上编辑」链接）
export const gitConfig = {
  user: "huanfeng",
  repo: "WindInputDocs",
  branch: "main",
};

export const releasesUrl = `https://github.com/${mainRepo.user}/${mainRepo.repo}/releases`;
export const githubUrl = `https://github.com/${mainRepo.user}/${mainRepo.repo}`;

/** 主程序的 issue 列表。程序本身的问题、需求、Bug 都往这里去。 */
export const issuesUrl = `${githubUrl}/issues`;

/**
 * 文档站仓库的 issue 列表。文档页底部的反馈引导指向它，
 * 见 components/docs-feedback.tsx。
 *
 * 与 issuesUrl 分开：内容写错、链接失效是这个仓的事，混进主程序仓只会让
 * 两边都得先分拣一遍。读者分不清也不要紧，转个 issue 的成本远低于让人先判断。
 */
export const docsFeedbackUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}/issues`;

// 顶栏导航项。纯数据，供自定义顶栏与文档侧栏共用。
export const navLinks: LinkItemType[] = [
  { text: "主页", url: "/", active: "url" },
  { text: "文档", url: "/docs", active: "nested-url" },
  { text: "下载", url: "/download", active: "url" },
  { text: "新功能", url: "/whats-new", active: "url" },
  { text: "更新记录", url: "/changelog", active: "url" },
  { text: "支持项目", url: "/sponsor", active: "url" },
  { text: "主题编辑器", url: "https://theme.windinput.com", external: true },
  { text: "主题市场", url: "https://market.windinput.com", external: true },
];
