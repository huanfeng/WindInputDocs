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

// 下载走 Cloudflare R2（国内直连稳定）；GitHub Releases 作为备用渠道。
//
// 文件名口径以主仓打包脚本为准（pack-installer.sh / dev.ps1 均产出
// WindInput-Setup-<版本>.exe），主仓 release-published.yml 按同名推送到 R2。
// 早期这里写成了 WindInput-<版本>-Setup.exe（沿用 Go 版命名），直链恒 404。
export const r2Base = "https://dl.windinput.com";
export const setupFileName = `WindInput-Setup-${currentVersion}.exe`;
export const setupDownloadUrl = `${r2Base}/${setupFileName}`;

// 下载计数接口，由 worker/（绑定 dl.windinput.com 的下载网关 Worker）提供。
// 返回 { total: number, versions: { version, count }[] }。Worker 未部署时前端静默降级。
export const statsUrl = `${r2Base}/api/stats`;
