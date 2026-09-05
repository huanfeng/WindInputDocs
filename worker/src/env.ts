export interface Env {
  DB: D1Database;
  /** R2 公共域（纯 R2 自定义域，配了 Cache Rule 的那个），不含结尾斜杠 */
  R2_PUBLIC_BASE: string;
  /** 主仓 `owner/repo`，Cron 同步 GitHub Releases 下载量用。未配则跳过同步。 */
  GITHUB_REPO?: string;
  /**
   * 可选的 GitHub API token（`wrangler secret put GITHUB_TOKEN`）。
   *
   * 不配也能跑，但匿名限额是 60 次/小时**按来源 IP**，而 Worker 的出站 IP 是
   * Cloudflare 共享地址——额度可能被同出口的其他人用光，表现为偶发 403。
   * 读公开仓库不需要任何 scope，空权限的 fine-grained token 就够。
   */
  GITHUB_TOKEN?: string;
}

export interface Artifact {
  version: string;
  platform: string;
}

/**
 * 安装包命名口径，与主仓 release.yml 的产物一致。**加平台只需在这里加一行**，
 * 计数、分流、镜像三处都会自动跟上——这是这套架构唯一需要知道文件名长相的地方。
 *
 * 不匹配任何一条的对象（发布说明 .md、校验值 .sha256、latest.json 等）不计数、
 * 不查镜像，直接 302 回 R2。
 */
const ARTIFACTS: { re: RegExp; platform: string }[] = [
  { re: /^WindInput-Setup-(.+)\.exe$/i, platform: "windows" },
  { re: /^WindInput-Portable-(.+)\.zip$/i, platform: "windows-portable" },
  { re: /^WindInput-(.+)-macOS\.pkg$/i, platform: "macos" },
];

/** 从对象名解析出版本与平台；不是安装包则返回 null。 */
export function parseArtifact(key: string): Artifact | null {
  for (const { re, platform } of ARTIFACTS) {
    const m = re.exec(key);
    if (m) return { version: m[1], platform };
  }
  return null;
}
