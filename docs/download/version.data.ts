import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const R2_BASE = (
  process.env.WINDINPUT_R2_BASE || "https://dl.windinput.com"
).replace(/\/+$/, "");

export default {
  load() {
    const content = readFileSync(
      resolve(__dirname, "../changelog/index.md"),
      "utf-8",
    );
    const match = content.match(/^## v([\w.-]+)/m);
    const version = match ? match[1] : null;
    return {
      version,
      githubUrl: version
        ? `https://github.com/huanfeng/WindInput/releases/download/v${version}/WindInput-${version}-Setup.exe`
        : null,
      r2DownloadUrl: version
        ? `${R2_BASE}/WindInput-${version}-Setup.exe`
        : null,
      r2ReleaseNotesUrl: version
        ? `${R2_BASE}/WindInput-${version}-Release.md`
        : null,
    };
  },
};
