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
  /** 收款码在 R2 桶中的对象 key，由组件拼上 r2Base 得到完整 URL */
  key: string;
}

/**
 * 收款码。图片放 R2（dl.windinput.com/sponsor/*）而**不进本仓库**：
 * 收款码是个人支付凭证，一旦 commit 就永久留在公开的 git 历史里，之后换码也撤不掉；
 * 放 R2 则可随时覆盖或删除，且换码不需要重新构建部署站点。
 *
 * 路径落在 `/sponsor/` 下，不匹配 worker/wrangler.jsonc 的两条窄路由
 * （`/WindInput-Setup-*` 与 `/api/*`），因此走 R2 直连——不唤起 Worker、
 * 不消耗额度，也不会被下载计数逻辑碰到。
 *
 * 上传（桶名 windinput，见 worker/wrangler.jsonc）：
 *
 *   wrangler r2 object put windinput/sponsor/wechat.png --remote \
 *     --file=wechat.png --content-type=image/png \
 *     --cache-control="public, max-age=3600"
 *
 * cache-control 要显式给：R2 直连不受 public/_headers 管辖，缓存只认对象自身的
 * 元数据。设 1 小时，换码后一小时内全网生效。
 *
 * 数组为空时页面显示「渠道准备中」而非破图——图片传好后取消下面两行注释即可上线。
 */
export const paymentMethods: PaymentMethod[] = [
  { id: "alipay", name: "支付宝", key: "sponsor/alipay.png" },
  { id: "wechat", name: "微信", key: "sponsor/wechat.png" },
];
