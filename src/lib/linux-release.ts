import fs from "node:fs";
import path from "node:path";

// Linux 安装包（Ubuntu 22.04+ / Debian 系，含 Deepin）的下载元数据。
//
// 数据源是 data/latest-linux.json，由 scripts/sync_release_notes.py 从 GitHub Release 组装
// ——两个架构的 .deb 都在才写。与 Windows / macOS 不同，这里**不按版本号拼文件名**：
// 首个带 Linux 包的版本之前根本没有这些文件，按版本号拼出来的直链恒 404。文件不存在
// （还没发过带 Linux 包的版本）就返回 null，下载页不给 Linux 入口。
//
// 只在构建期读（下载页是静态导出的服务端组件），故直接用 fs，不放进会被客户端组件引用的
// lib/releases.ts。

export interface LinuxDeb {
  url: string;
  sha256: string;
  size: number;
}

export interface LinuxRelease {
  version: string;
  debs: { amd64: LinuxDeb; arm64: LinuxDeb };
}

export function linuxRelease(): LinuxRelease | null {
  const file = path.join(process.cwd(), "data", "latest-linux.json");
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(
    fs.readFileSync(file, "utf8"),
  ) as Partial<LinuxRelease>;
  if (!data.version || !data.debs?.amd64?.url || !data.debs?.arm64?.url)
    return null;
  return data as LinuxRelease;
}

/** 下载地址里的文件名（展示用）。 */
export function debFileName(deb: LinuxDeb): string {
  return deb.url.slice(deb.url.lastIndexOf("/") + 1);
}
