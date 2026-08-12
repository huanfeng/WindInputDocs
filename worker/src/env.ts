export interface Env {
  DB: D1Database;
  /** R2 公共域（纯 R2 自定义域，配了 Cache Rule 的那个），不含结尾斜杠 */
  R2_PUBLIC_BASE: string;
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
