// 「支持项目」页（/sponsor）的可配置数据。文案本身写在页面里，这里只放
// 需要跨文件共享、或日后会改动的部分。

/**
 * 公开联系邮箱。域名邮箱本身没有收件箱，需在 Cloudflare
 * Email Routing 里加一条转发规则指向真实邮箱。
 */
export const contactEmail = "hi@windinput.com";

/** QQ 交流群。url 是群管理页生成的一键加群链接。 */
export const qqGroup = {
  number: "1085293418",
  url: "https://qm.qq.com/q/u2A8FfafIs",
};

export interface PaymentMethod {
  id: string;
  /** 仅用于图片 alt——图上本就印着渠道名，页面不再另加图注 */
  name: string;
  /** 站内路径（相对站点根，不带前导斜杠），由组件拼成 `/${key}` */
  key: string;
}

/**
 * 收款码。图片**不进本仓库**：收款码是个人支付凭证，一旦 commit 就永久留在公开的
 * git 历史里，之后换码也撤不掉。
 *
 * 取用方式是**构建期拉取**：scripts/fetch-assets.mjs 在构建前从源站下载到
 * public/sponsor/，随站点产物一起部署（该目录已在 .gitignore 中）。
 *
 * 从前是前端运行时直连 R2。改掉是因为那要求**每个访客都能访问 R2**，而 R2 在
 * 部分区域完全不可达——赞助页在那些地方就是两个破图。构建期拉取把这个要求降到
 * 「CI 能访问一次源」，代价是换码后要重新部署一次。收款码几乎不变，这个代价可忽略。
 *
 * 换码：把新图传到源站同名对象，然后重新部署站点。源站地址见 fetch-assets.mjs，
 * 可用 ASSET_SOURCE_BASE 覆盖。
 *
 * 下面的 key 与 fetch-assets.mjs 的 ASSETS[].local 一一对应，改动需同步。
 *
 * 数组为空时页面显示「渠道准备中」而非破图——这也是源站故障时的应急出口：
 * 清空本数组即可让构建绕过收款码继续走。
 */
export const paymentMethods: PaymentMethod[] = [
  { id: "alipay", name: "支付宝", key: "assets/qr/alipay.png" },
  { id: "wechat", name: "微信", key: "assets/qr/wechat.png" },
];
