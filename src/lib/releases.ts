// 版本与更新记录数据源。
// 目前手工维护；待接入主仓 docs/VERSION 发布链路后由发布流程自动更新（见 README「待接入」）。

export const currentVersion = "0.109.0";

export interface ReleaseEntry {
  version: string;
  /** 发布日期，YYYY-MM-DD；未知时省略 */
  date?: string;
  /** 变更条目，纯文本 */
  notes: string[];
}

// 按约定：更新记录从文档站上线时的版本起算，更早的历史见 GitHub Releases。
export const releases: ReleaseEntry[] = [
  {
    version: "0.109.0",
    notes: [
      "当前版本。更新记录自本版本起在此发布，更早的版本变更请见 GitHub Releases。",
    ],
  },
];
