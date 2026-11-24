#!/usr/bin/env python3
"""从 WindInputAndroid 的 GitHub Release 组装安卓版元数据与更新记录。

用法：
    python3 scripts/sync_android_release.py <release.json>

<release.json> 是 `gh api repos/huanfeng/WindInputAndroid/releases/tags/...` 的原始输出。

产出（都在 data/ 下，与电脑版的 latest*.json / releases.json 互不相干）：
- latest-android.json   最新版的下载元数据。构建期原样拷进 out/latest-android.json
                        （scripts/gen-dist-files.mjs），下载页读它拼 APK 直链。
- releases-android.json 更新记录（新版本在前）。

与电脑版同步脚本（sync_release_notes.py）的差异：
- **预发布也收**。安卓版目前都是 GitHub 预发布；电脑版排除预发布是因为 latest.json 是应用内
  升级的开关，而安卓版没有联网权限、没有应用内升级，元数据只服务于下载页。channel 字段
  记 preview / stable，展示侧据此标注。
- APK 在 R2 的 android/ 前缀下（安卓仓 release-published.yml 镜像上传），与电脑版安装包互不干扰。
- Release 正文没有 user-facing 标记块：用户向说明是正文里「## 校验」之前的部分
  （见安卓仓 release.yml 的「生成 Release Notes」）。
- 只写 data/，**不决定页面显不显示**——那是 src/lib/android-gate.ts 的事。
"""

import json
import os
import re
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sync_release_notes import DL_BASE, normalize, to_notes, version_key  # noqa: E402

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
LATEST = os.path.join(DATA_DIR, "latest-android.json")
RELEASES = os.path.join(DATA_DIR, "releases-android.json")


def apk_name(version: str) -> str:
    """口径与安卓仓 release.yml 的「命名产物」一致。"""
    return f"WindInputAndroid-{version}.apk"


def channel_of(release: dict, version: str) -> str:
    return "preview" if release.get("prerelease") or "-" in version else "stable"


def user_section(body: str) -> str:
    """正文里「## 校验」之前的部分；没有该标题时取全文。"""
    text = normalize(body)
    m = re.search(r"^## 校验\s*$", text, re.MULTILINE)
    return (text[: m.start()] if m else text).strip()


def build_latest(release: dict, version: str) -> dict | None:
    name = apk_name(version)
    asset = next((a for a in release.get("assets", []) if a.get("name") == name), None)
    if asset is None:
        return None
    digest = asset.get("digest") or ""
    return {
        "version": version,
        "tag": release.get("tag_name") or f"v{version}",
        "channel": channel_of(release, version),
        "apkUrl": f"{DL_BASE}/android/{name}",
        "sha256": digest.split(":", 1)[1] if digest.startswith("sha256:") else "",
        "size": asset.get("size", 0),
        "minSdk": 26,
        "abi": "arm64-v8a",
        "releaseNotesUrl": release.get("html_url", ""),
        "publishedAt": release.get("published_at", ""),
    }


def read_json(path: str, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def write_json(path: str, data) -> bool:
    """内容无变化时不落盘（避免无意义的 diff）。"""
    if read_json(path, None) == data:
        print(f"{os.path.basename(path)} 无变化。")
        return False
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"已更新 {os.path.basename(path)}")
    return True


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <release.json>", file=sys.stderr)
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        release = json.load(f)

    version = (release.get("tag_name") or "").lstrip("v")
    if not version:
        print("ERROR: release 缺少 tag_name", file=sys.stderr)
        sys.exit(1)
    if release.get("draft"):
        print(f"v{version} 还是草稿，不同步。")
        return

    raw_date = release.get("published_at", "")
    entry = {"version": version}
    if raw_date:
        entry["date"] = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).strftime("%Y-%m-%d")
    entry["channel"] = channel_of(release, version)
    entry["notes"] = to_notes(user_section(release.get("body") or ""))

    releases = read_json(RELEASES, [])
    existing = next((r for r in releases if r.get("version") == version), None)
    # 空说明不覆盖已有内容（定时兜底每天重跑，Release 正文被改坏时别把已同步的抹空）
    if existing and not entry["notes"] and existing.get("notes"):
        entry["notes"] = existing["notes"]
    releases = [r for r in releases if r.get("version") != version] + [entry]
    releases.sort(key=lambda r: version_key(r["version"]), reverse=True)
    write_json(RELEASES, releases)

    # 只在同步的确实是最新版时才改 latest：补同步旧 tag 不该把下载页指回旧版
    if releases[0]["version"] != version:
        print(f"v{version} 不是最新版（当前 v{releases[0]['version']}），跳过 latest-android.json。")
        return
    latest = build_latest(release, version)
    if latest is None:
        # APK 还没传完就触发了：保留旧文件，指向上一个可用版本好过写出 404 的新文件
        print(
            f"::warning::v{version} 的 Release 里找不到 {apk_name(version)}，"
            "latest-android.json 保持不变。",
            file=sys.stderr,
        )
        return
    write_json(LATEST, latest)


if __name__ == "__main__":
    main()
