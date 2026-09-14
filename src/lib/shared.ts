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

/** 社区论坛。这里是这个地址的**单一来源**。 */
export const forumUrl = "https://forum.windinput.com";

/**
 * 社区的「文档反馈」版块。文档页底部的反馈引导指向它，
 * 见 components/docs-feedback.tsx。
 *
 * cid 11 取自 windinput-bbs 的 settings/_categories-def.js —— 七个版块里的最后一个，
 * NodeBB 按创建顺序发 cid。NodeBB 认的是 cid，后面那截名字改了也不会让链接失效，
 * 写出来只是为了这行本身可读。
 */
export const docsFeedbackUrl = `${forumUrl}/category/11/文档反馈`;

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
