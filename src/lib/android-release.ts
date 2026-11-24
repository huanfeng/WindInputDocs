import fs from "node:fs";
import path from "node:path";

// 安卓版（APK）的下载元数据。
//
// 数据源是 data/latest-android.json，由 scripts/sync_android_release.py 从 WindInputAndroid 的
// GitHub Release 组装（安卓仓 release-published.yml 先把 APK 镜像到 R2 的 android/ 前缀再通知这里）。
// 与 Linux 同理，**不按版本号拼文件名**：文件不存在（还没镜像过）就返回 null，下载页不给安卓入口。
//
// 只在构建期读（下载页是静态导出的服务端组件），故直接用 fs。

export interface AndroidRelease {
  version: string;
  /** preview = 预发布；stable = 正式版 */
  channel: "preview" | "stable";
  apkUrl: string;
  sha256: string;
  size: number;
  minSdk: number;
  abi: string;
  /** GitHub Release 页（更新说明与历史版本） */
  releaseNotesUrl: string;
}

export function androidRelease(): AndroidRelease | null {
  const file = path.join(process.cwd(), "data", "latest-android.json");
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(
    fs.readFileSync(file, "utf8"),
  ) as Partial<AndroidRelease>;
  if (!data.version || !data.apkUrl) return null;
  return data as AndroidRelease;
}
