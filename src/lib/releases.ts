// 版本与更新记录。
//
// 数据源是 data/releases.json，由 .github/workflows/sync-changelog.yml 在主仓发布
// Release 时自动写入（scripts/sync_release_notes.py），**不要手工编辑那个文件**。
// 本模块只负责类型约束与派生量。
import releasesData from "../../data/releases.json";

export interface ReleaseEntry {
  version: string;
  /** 发布日期，YYYY-MM-DD；未知时省略 */
  date?: string;
  /** 变更条目，纯文本 */
  notes: string[];
}

// 按约定：更新记录从文档站上线时的版本起算，更早的历史见 GitHub Releases。
// JSON 中始终新版本在前，由同步脚本保证顺序。
export const releases: ReleaseEntry[] = releasesData;

// 最新版本即列表首项——下载直链与更新记录共用同一数据源，避免两处手工同步产生漂移。
export const currentVersion = releases[0].version;

/** 把 `0.117.0` / `0.111.0-rc.1` 归一到 `<major>.<minor>` 的数值对。
 *
 * 文档里的 `<Since v="0.117" />` 只写两段，releases.json 写三段，两侧对不上号。
 * 补丁版不新增功能，按 minor 合并即可；预发布后缀同理并入其正式版。 */
function minorPair(version: string): [number, number] {
  const m = /^(\d+)\.(\d+)/.exec(version);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

/** 把版本归一到 `<major>.<minor>` 字符串，供按 minor 归拢的场合做键。 */
export function minorOf(version: string): string {
  const m = /^(\d+)\.(\d+)/.exec(version);
  return m ? `${m[1]}.${m[2]}` : version;
}

/** 每个 minor 版本的首发版本号，如 `0.115` → `0.115.0`。
 *
 * releases 按版本降序，同 minor 最后写入的即最早发布的那个。 */
const firstOfMinor = new Map<string, string>();
for (const r of releases) firstOfMinor.set(minorOf(r.version), r.version);

/** 这个版本是不是它那个 minor 的首发版。
 *
 * 文档里的 `<Since v="0.115" />` 只精确到 minor，而 releases 有 0.115.0 / 0.115.1
 * 两条——不挑一条挂，同一批功能会在两处各列一遍。挂在首发版上：功能是那次带来的，
 * 补丁版只是修它。 */
export function isFirstOfMinor(version: string): boolean {
  return firstOfMinor.get(minorOf(version)) === version;
}

/** 文档标注的版本是否还没发布。
 *
 * 文档常常先于发布写好（功能做完就补文档），但读者装的是已发布版，看到装不上的功能
 * 只会困惑。判据取自 releases.json——版本一发布，CI 更新该文件，隐藏自动解除，
 * 不需要回头去摘任何标记。 */
export function isUnreleased(version: string): boolean {
  const [major, minor] = minorPair(version);
  const [curMajor, curMinor] = minorPair(currentVersion);
  return major > curMajor || (major === curMajor && minor > curMinor);
}

// 下载走 Cloudflare R2（国内直连稳定）；GitHub Releases 作为备用渠道。
//
// 文件名口径以主仓打包脚本为准（pack-installer.sh / dev.ps1 均产出
// WindInput-Setup-<版本>.exe），主仓 release-published.yml 按同名推送到 R2。
// 早期这里写成了 WindInput-<版本>-Setup.exe（沿用 Go 版命名），直链恒 404。
export const r2Base = "https://dl.windinput.com";
export const setupFileName = `WindInput-Setup-${currentVersion}.exe`;
export const setupDownloadUrl = `${r2Base}/${setupFileName}`;

// macOS 安装包（universal，内含输入法 / 后台服务 / 设置程序）。文件名口径与下载网关
// worker/src/env.ts 的 ARTIFACTS 正则一致（^WindInput-(.+)-macOS\.pkg$ → platform=macos），
// 命名与 Windows 侧不同源，故单独拼装而非套用 setupFileName 的模式。
export const macFileName = `WindInput-${currentVersion}-macOS.pkg`;
export const macDownloadUrl = `${r2Base}/${macFileName}`;

// 下载计数接口，由 worker/（绑定 dl.windinput.com 的下载网关 Worker）提供。
// 数字是「站内 + GitHub Releases」合并后的口径（GitHub 侧由 Cron 每小时同步）。
// Worker 未部署时前端静默降级。
export const statsUrl = `${r2Base}/api/stats`;

// 明细档：额外返回版本 × 平台的原始行，供下载页的统计面板展开时拉取。
// 与精简档分开是因为明细有百来行，而绝大多数访问只看一眼徽章，不该为面板付流量。
//
// 用**路径**而不是 ?detail=1 参数：dl.windinput.com 的解析在 EdgeOne，它默认
// 「忽略参数缓存」，带参数的请求会命中精简档那条缓存，面板永远等不到数据。
export const statsDetailUrl = `${statsUrl}/detail`;
