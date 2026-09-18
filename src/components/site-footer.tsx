/**
 * 页脚。当前只承载 ICP 备案号。
 *
 * 备案号是工信部对境内网站的硬性要求：必须出现在首页底部，且链接到
 * beian.miit.gov.cn 供人核验。所以这里既不能只写文字不给链接，也不能把它
 * 混进友链那一排 —— 它不是站长想推荐的去处，是合规标识。
 *
 * 版式上刻意比友链再淡一档（text-xs + muted）：页面的信息到友链就结束了，
 * 这一条只是落款。
 */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 text-center text-xs text-fd-muted-foreground">
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          /* 与友链同理：noopener 挡 window.opener 反向操纵，noreferrer 不带来源 */
          rel="noopener noreferrer"
          className="transition-colors hover:text-fd-primary"
        >
          粤ICP备2026141259号-1
        </a>
      </div>
    </footer>
  );
}
