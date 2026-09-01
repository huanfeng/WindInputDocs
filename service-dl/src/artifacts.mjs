/**
 * 安装包命名口径。与 worker/src/env.ts 的 ARTIFACTS、edge/gateway.js 的同名常量
 * 三处一致——**加平台要三处一起加**。分散是部署形态决定的（一份跑在边缘、一份
 * 跑在这里、一份是待退役的 Worker），不是遗漏。
 *
 * 单独成文件是为了让 gateway.mjs 与 mirrors.mjs 都能引用而不互相 import——
 * 后者的探活逻辑要靠它解析版本号来判定「最新版本」，前者要靠它解析下载请求。
 */
const ARTIFACTS = [
  { re: /^WindInput-Setup-(.+)\.exe$/i, platform: "windows" },
  { re: /^WindInput-Portable-(.+)\.zip$/i, platform: "windows-portable" },
  { re: /^WindInput-(.+)-macOS\.pkg$/i, platform: "macos" },
];

export function parseArtifact(key) {
  for (const { re, platform } of ARTIFACTS) {
    const m = re.exec(key);
    if (m) return { version: m[1], platform };
  }
  return null;
}
