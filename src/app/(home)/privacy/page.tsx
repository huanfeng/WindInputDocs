import { Bug, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { issuesUrl } from "@/lib/shared";
import { contactEmail } from "@/lib/sponsor";

export const metadata: Metadata = {
  title: "隐私政策",
  description:
    "清风输入法不收集、不上传你输入的内容。输入法本身不联网；电脑版只有设置程序在你同意或操作后才联网，安卓版没有网络权限。本页逐项说明每一处联网与本地数据。",
};

/**
 * 本页每一条都对应代码里的事实，改功能时要回头核对这里：
 * - 电脑版联网：只在设置程序（wind-setting 仓）——检查更新 `src/update/`、
 *   主题网址导入 `src/theme_import.rs`、方案包网址导入 `src/schema_url_import.rs`、
 *   本机主题编辑器服务 `src/theme_editor_server.rs`。输入法核心（WindInput 仓）
 *   不依赖任何 HTTP 库。
 * - 安卓版：与 App 内「隐私政策」（WindInputAndroid 仓
 *   `app/src/main/java/com/windinput/ime/settings/PrivacySection.kt`）保持一致。
 * - 下载计数：WindInputSite 仓 `worker/src/download.ts`。
 */
const effectiveDate = "2026 年 11 月 7 日";

const notCollected = [
  "你输入的文字、候选与按键，不会被上传到任何地方",
  "没有云输入、云同步、广告、统计上报或崩溃自动上报",
  "不使用设备标识、账号，也没有用户注册",
];

const localData = [
  {
    title: "设置与个人词库",
    body: "你造的词、调整过的词频与候选位置、自己添加的词条与命令短语、联想记录。只用于在本机出候选。",
  },
  {
    title: "输入统计",
    body: "每天打了多少字、什么类别、码长与选了第几个候选这类数量，不记录具体内容。电脑版可在统计页关闭或清空。",
  },
  {
    title: "日志",
    body: "出厂级别只记警告、错误与一般运行信息，不含你输入的文字。只有你手动把级别调到「调试」「跟踪」排查问题时才会记下输入内容，用完请调回。",
  },
  {
    title: "剪贴板历史（安卓版）",
    body: "复制过的文字，未置顶的最多保留 50 条；系统标记为敏感的内容（如密码管理器复制的密码）不记。",
  },
];

const dataLocations = [
  {
    platform: "Windows",
    paths: [
      "%APPDATA%\\WindInput\\（配置与用户数据，安装时可自选位置）",
      "%LOCALAPPDATA%\\WindInput\\（缓存、日志、界面状态）",
    ],
    remove:
      "卸载时选择「删除用户数据」；或手动删除上面两个目录。便捷模式的数据在解压目录里，删目录即可。",
  },
  {
    platform: "macOS",
    paths: ["~/Library/Application Support/WindInput/"],
    remove: "卸载程序默认保留这个目录，不需要了可手动删除。",
  },
  {
    platform: "Linux",
    paths: [
      "~/.config/WindInput/（配置与用户数据）",
      "~/.local/share/WindInput/（缓存、运行状态、日志）",
    ],
    remove: "卸载软件包不会删除这两个目录，不需要了可手动删除。",
  },
  {
    platform: "安卓",
    paths: ["本应用的私有目录，其他应用读不到"],
    remove:
      "剪贴板历史在剪贴板面板里删除或清空，统计、个人词在设置里清空；系统设置 → 应用 → 清风输入法 → 存储 → 清除数据可删除全部，卸载也会删除全部数据。",
  },
];

interface NetFeature {
  title: string;
  when: ReactNode;
  sends: ReactNode;
  off: ReactNode;
}

const desktopNet: NetFeature[] = [
  {
    title: "检查更新",
    when: (
      <>
        第一次在「关于 → 检查更新」里点击时，会先询问是否同意联网，
        <strong className="font-semibold text-fd-foreground">
          未同意之前不发出任何网络请求
        </strong>
        。同意后，你打开设置程序时最多每 24 小时自动检查一次。
      </>
    ),
    sends: (
      <>
        读取一份公开的版本说明文件：先访问{" "}
        <code className="font-mono">windinput.com</code>，不通时改用{" "}
        <code className="font-mono">dl.windinput.com</code>（文件名按平台为
        latest.json、latest-mac.json 或
        latest-linux.json），随后读取最新版本的更新说明。请求不带任何参数，
        不附带设备标识、本机版本号或输入内容，新旧版本的比较在本机完成。
      </>
    ),
    off: "在更新对话框里取消勾选「打开设置时自动检查更新」。之后只有你手动点「检查更新」才会联网。",
  },
  {
    title: "下载更新",
    when: "只在检查到新版本、你点了下载之后。",
    sends: (
      <>
        从 <code className="font-mono">dl.windinput.com</code>{" "}
        下载安装包，下载完成后在本机校验文件完整性再安装。下载服务会给每个版本、每个平台记一次下载次数；
        访问记录里有文件名、浏览器或程序标识（User-Agent），以及由网络节点推断的国家
        / 地区与运营商，
        <strong className="font-semibold text-fd-foreground">
          不记录 IP 地址
        </strong>
        。网站上的下载按钮走的是同一个下载服务。
      </>
    ),
    off: "不点下载就不会发生。",
  },
  {
    title: "从网址导入主题",
    when: (
      <>
        你在主题导入里粘贴一个 https 链接，或在网页上点了{" "}
        <code className="font-mono">windinput://import/theme</code>{" "}
        链接并在弹出的确认框里点「下载并导入」。
      </>
    ),
    sends:
      "向那个链接所在的网站请求一次主题文件。那可能是第三方网站，它能看到一次普通的下载请求，看不到你的任何本地数据。",
    off: "不使用就不会发生。",
  },
  {
    title: "从网址导入方案",
    when: (
      <>
        你在主题与方案市场等网页上点了{" "}
        <code className="font-mono">windinput://import/schema</code>{" "}
        链接。设置程序收到链接即开始下载，装不装由随后的确认框决定。
      </>
    ),
    sends: (
      <>
        只接受 <code className="font-mono">windinput.com</code>{" "}
        及其子域名的地址（包括中途的每一次跳转），其他网址一律拒绝，不会发出请求。
      </>
    ),
    off: "不点这类链接就不会发生。",
  },
  {
    title: "主题编辑器本机连接",
    when: "你在「外观 → 主题编辑器」里把连接模式设为「本次开启」或「自动开启」时。出厂为关闭。",
    sends: (
      <>
        这不是向外联网：设置程序在本机地址（127.0.0.1）上开一个小服务，让浏览器里打开的{" "}
        <code className="font-mono">theme.windinput.com</code>{" "}
        编辑器能读取、保存你本机的主题。只监听本机，只接受本机页面与
        windinput.com 页面的访问，传递的只有主题文件。
      </>
    ),
    off: "把连接模式设回「关闭」。",
  },
];

const androidPermissions = [
  {
    title: "振动",
    body: "按键振动反馈，强度可在设置里调，也可以关闭。",
  },
  {
    title: "输入法服务",
    body: "系统要求每个输入法声明的绑定权限，只有系统能连接它。",
  },
];

const thirdParties = [
  {
    title: "语音输入",
    body: "安卓版的语音键是把你转到系统里另装的语音输入法（如 Google 语音输入），清风输入法本身不录音。语音内容由那个输入法按它自己的隐私政策处理。",
  },
  {
    title: "浏览器打开的网页",
    body: "「关于」里的官网、反馈、文档链接，以及选中「打开百度」「汉典」这类命令候选时，都是交给浏览器打开对应网站。像汉典这类命令会把刚打的字放进网址，只在你选中那条候选时发生。",
  },
  {
    title: "GitHub",
    body: "反馈问题的入口是 GitHub Issues，发在那里的内容是公开的。",
  },
  {
    title: "系统备份服务",
    body: "安卓版的设置与个人词库会随你开启的系统备份（Google 备份或手机厂商的换机 / 云备份）一起备份，由对应服务保管。",
  },
  {
    title: "分享目标",
    body: "安卓版「分享诊断信息」发给谁，由你在系统分享面板里选择，之后由那个应用处理。",
  },
];

const siteItems = [
  "没有统计分析脚本、广告、评论区，也不设 Cookie。",
  "浏览器本地存储（localStorage）只记几样界面状态：已关闭的站点公告、预览模式开关、下载页统计面板是否已展开。这些只留在你的浏览器里，不会发给我们。",
  "下载页会从 dl.windinput.com 读取公开的下载次数用于展示；点下载按钮时的计数与记录方式同上文「下载更新」。",
  "站点托管在 Cloudflare 与腾讯云 EdgeOne 上，它们作为网络服务商会按各自的政策处理访问请求。",
];

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-xl font-bold">
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight">隐私政策</h1>
        <p className="mt-3 text-sm text-fd-muted-foreground">
          生效日期：{effectiveDate}
        </p>
      </div>

      {/* 一句话总结 */}
      <p className="mt-10 rounded-lg border bg-fd-card/50 p-5 leading-relaxed">
        清风输入法
        <strong className="font-semibold">不收集、不上传你输入的内容</strong>
        。输入法本身不联网；电脑版只有设置程序在你同意或主动操作后才联网（检查更新、下载主题与方案），
        安卓版没有网络权限。你的设置、词库与统计都只存在你自己的设备上。
      </p>
      <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">
        本页覆盖电脑版（Windows、macOS、Linux）与安卓版，以及本网站。清风输入法开源，
        下面每一条都可以在源代码里核对。
      </p>

      <section className="mt-14">
        <SectionTitle id="collect">收集什么，不收集什么</SectionTitle>
        <ul className="mt-4 flex list-inside list-disc flex-col gap-1.5 text-sm leading-relaxed text-fd-muted-foreground">
          {notCollected.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-fd-muted-foreground">
          为了出候选、记住你的习惯，输入法会在本机保存以下数据，它们不会离开你的设备（安卓系统备份除外，见下文）：
        </p>
        <dl className="mt-4 flex flex-col gap-4 rounded-lg border bg-fd-card/50 p-5">
          {localData.map((d) => (
            <div key={d.title}>
              <dt className="font-semibold">{d.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fd-muted-foreground">
                {d.body}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">
          在密码输入框里：电脑版默认在识别到密码框时强制英文输入（「密码框强制英文」），安卓版在密码框与应用要求不学习的输入框里不记词频、不造词、不计统计。
        </p>
      </section>

      <section className="mt-14">
        <SectionTitle id="storage">数据存在哪里、如何删除</SectionTitle>
        <div className="mt-4 flex flex-col gap-4">
          {dataLocations.map((l) => (
            <div key={l.platform} className="rounded-lg border p-5">
              <h3 className="font-semibold">{l.platform}</h3>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {l.paths.map((p) => (
                  <li key={p} className="break-all font-mono text-xs">
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
                {l.remove}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">
          电脑版各文件的用途见
          <Link
            href="/docs/start/concepts#数据存在哪里"
            className="text-fd-primary hover:underline"
          >
            数据存在哪里
          </Link>
          。反馈问题需要附日志时，请先读
          <Link
            href="/docs/reference/report-logs#privacy"
            className="text-fd-primary hover:underline"
          >
            发送日志前的隐私提示
          </Link>
          。
        </p>
      </section>

      <section className="mt-14">
        <SectionTitle id="desktop-network">电脑版的联网功能</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          输入法本身（后台服务与系统输入法框架里的部分）不包含任何联网代码，只在本机进程之间通信。
          会联网的只有设置程序，下面是它全部的联网场景：
        </p>
        <div className="mt-5 flex flex-col gap-4">
          {desktopNet.map((f) => (
            <div key={f.title} className="rounded-lg border p-5">
              <h3 className="font-semibold">{f.title}</h3>
              <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm leading-relaxed sm:grid-cols-[5rem_1fr]">
                <dt className="font-medium text-fd-foreground">何时发生</dt>
                <dd className="text-fd-muted-foreground">{f.when}</dd>
                <dt className="font-medium text-fd-foreground">发送什么</dt>
                <dd className="text-fd-muted-foreground">{f.sends}</dd>
                <dt className="font-medium text-fd-foreground">怎么关</dt>
                <dd className="text-fd-muted-foreground">{f.off}</dd>
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">
          所有联网都只走 https。和任何网络请求一样，对方服务器能看到你的 IP
          地址与请求时间，以及所用网络库的名称版本（User-Agent）。
        </p>
      </section>

      <section className="mt-14">
        <SectionTitle id="android">安卓版</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          安卓版
          <strong className="font-semibold text-fd-foreground">
            没有申请网络权限
          </strong>
          ，程序本身无法连接互联网。App 内「隐私政策」页与本节内容一致。
        </p>

        <h3 className="mt-6 font-semibold">申请的权限</h3>
        <dl className="mt-3 flex flex-col gap-3 rounded-lg border bg-fd-card/50 p-5">
          {androidPermissions.map((p) => (
            <div key={p.title}>
              <dt className="font-medium">{p.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fd-muted-foreground">
                {p.body}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">
          不申请麦克风、通讯录、位置、存储等权限。导入方案、导入导出词库时读写的文件，都由你在系统文件选择器里逐次选定，或由你从别的应用打开、分享过来。
        </p>

        <h3 className="mt-6 font-semibold">
          启用时的「可能会收集您输入的所有文字」提示
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          在系统里启用任何第三方输入法时，系统都会提示「此输入法可能会收集您输入的所有文字，包括密码和信用卡号等个人数据」。
          这是系统对所有输入法的统一提示，并不针对某一款：输入法确实能看到你打的每一个字，所以要选信得过的。
          清风输入法看到的文字只用于在本机出候选、学习词频，不会被上传。
        </p>

        <h3 className="mt-6 font-semibold">系统备份</h3>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          如果你在系统里开了备份（Google 备份或手机厂商的换机 /
          云备份），设置与个人词库会随系统备份，换机后可以恢复。
          剪贴板历史、崩溃记录、日志与可重建的缓存不进备份。
        </p>

        <h3 className="mt-6 font-semibold">诊断信息与日志</h3>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          「关于 →
          分享诊断信息」只在你点击时生成，内容是版本、系统版本、机型、处理器架构、最近一次崩溃的调用栈和最近的程序日志（只取一般信息及以上级别，不含输入的文字）。
          发不发、发给谁都由你在系统分享面板里选择。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          程序日志写进系统日志（logcat），出厂只记警告与错误。例外：设置首页「试一试」的测试输入框会把框里的文字记进系统日志（供自动化测试读取），请不要在那里输入隐私内容；分享诊断信息不包含这部分。
        </p>
      </section>

      <section className="mt-14">
        <SectionTitle id="third-party">第三方</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          清风输入法不内置任何第三方统计或广告组件。以下场景会由你主动交给其他应用或服务：
        </p>
        <dl className="mt-4 flex flex-col gap-4 rounded-lg border bg-fd-card/50 p-5">
          {thirdParties.map((t) => (
            <div key={t.title}>
              <dt className="font-semibold">{t.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-fd-muted-foreground">
                {t.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14">
        <SectionTitle id="website">本网站</SectionTitle>
        <ul className="mt-4 flex list-inside list-disc flex-col gap-1.5 text-sm leading-relaxed text-fd-muted-foreground">
          {siteItems.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <SectionTitle id="changes">变更与联系</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          功能变化影响到本页内容时，我们会同步更新本页并修改上方的生效日期。本页源码与修改历史在文档站仓库中公开。
        </p>
        <ul className="mt-4 flex flex-col gap-1.5 rounded-lg border bg-fd-card/50 p-5 text-sm leading-relaxed text-fd-muted-foreground">
          <li className="flex flex-wrap items-center gap-2">
            <Bug className="size-4 shrink-0" aria-hidden />
            问题与建议：
            <Link href={issuesUrl} className="text-fd-primary hover:underline">
              GitHub Issues
            </Link>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <Mail className="size-4 shrink-0" aria-hidden />
            不便公开的隐私问题：
            <a
              href={`mailto:${contactEmail}`}
              className="text-fd-primary hover:underline"
            >
              {contactEmail}
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
