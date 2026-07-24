#!/usr/bin/env python3
"""从 GitHub Release body 提取用户向更新说明，写入 data/releases.json。

用法：
    python3 scripts/sync_release_notes.py <release.json>

<release.json> 是 `gh api repos/huanfeng/WindInput/releases/...` 的原始输出。

约定：
- Release body 中用 `<!-- user-facing:start -->` / `<!-- user-facing:end -->`
  包裹面向用户的更新说明（主仓侧的既有约定，本脚本不改变它）。
- 标记块是 Markdown。站点的 notes 是字符串数组：标题行保留 `#` 前缀（前端渲染成
  小节标题），列表项转为纯文本条目。嵌套层级被拍平，行内标记（粗体/代码/链接）被剥掉。
  Release notes 写成「## 小节 + 单层列表」时无损。
- 同版本重复同步会覆盖原条目，不会重复插入（幂等）。
- 没有标记块时仍写入版本条目，只是 notes 为空——下载页的直链只依赖版本号，
  不应被更新说明的有无卡住。但空 notes 不会覆盖已有的非空内容。
"""

import json
import os
import re
import sys
from datetime import datetime

RELEASES_JSON = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "releases.json",
)

USER_START = "<!-- user-facing:start -->"
USER_END = "<!-- user-facing:end -->"


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <release.json>", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1], encoding="utf-8") as f:
        release = json.load(f)

    version = release.get("tag_name", "").lstrip("v")
    if not version:
        print("ERROR: release 缺少 tag_name", file=sys.stderr)
        sys.exit(1)

    raw_date = release.get("published_at", "")
    date = (
        datetime.fromisoformat(raw_date.replace("Z", "+00:00")).strftime("%Y-%m-%d")
        if raw_date
        else None
    )

    # 更新说明可能缺失（Release 未填标记块，或占位文本未替换），此时仍要写入版本
    # 条目：下载页的直链只依赖 version，不该被"更新日志写没写"卡住。
    section = extract_user_section(release.get("body", ""))
    notes = to_notes(section) if section else []
    if not notes:
        print(f"v{version} 没有可用的用户向更新说明，只写版本号。")

    entry = {"version": version}
    if date:
        entry["date"] = date
    entry["notes"] = notes

    changed, written = upsert(entry)
    print(f"{'已更新' if changed else '无变化'}：v{version}（{len(written['notes'])} 条）")


def extract_user_section(body: str) -> str | None:
    """取出 Release body 中的用户向段落。"""
    body = body.replace("\r\n", "\n").replace("\r", "\n")

    m = re.search(
        rf"{re.escape(USER_START)}\n(.*?)\n{re.escape(USER_END)}",
        body,
        re.DOTALL,
    )
    if m:
        content = m.group(1).strip()
        # 主仓的 Release 模板里留了占位文本，未编辑时不应同步
        if re.match(r"^\s*>?\s*暂未填写", content):
            return None
        return content

    # 旧格式兼容：`## 更新记录` 到 `---` 分隔符
    m = re.search(r"\n## 更新记录\n(.*?)(?:\n---(?:\n|$)|$)", body, re.DOTALL)
    if m:
        return m.group(1).strip()

    return None


def to_notes(section: str) -> list[str]:
    """Markdown 段落 → 条目数组。

    标题行（`#`~`######`）**保留** `#` 前缀，供前端识别并渲染为小节标题；
    其余列表项 / 引用去掉行首符号，行内标记一律剥掉，得到纯文本条目。
    列表层级仍被拍平（站点按扁平结构渲染，标题分组即可）。
    """
    notes = []
    for raw in section.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if re.match(r"^#{1,6}\s+", line):
            # 保留 # 前缀（前端据此分组），仅剥掉行内标记
            line = strip_inline(line)
            if line:
                notes.append(line)
            continue
        # 列表项：去掉任意层级的项目符号（层级被拍平）
        line = re.sub(r"^[-*+]\s+", "", line)
        # 引用：去掉 > 前缀
        line = re.sub(r"^>\s*", "", line)
        line = strip_inline(line)
        if line:
            notes.append(line)
    return notes


def strip_inline(text: str) -> str:
    """剥掉行内 Markdown 标记，保留可读文字。"""
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)  # [文字](链接) → 文字
    text = re.sub(r"`([^`]+)`", r"\1", text)  # `代码` → 代码
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)  # **粗体** → 粗体
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"\1", text)  # *斜体* → 斜体
    return text.strip()


def version_key(version: str):
    """语义化版本排序键；无法解析时退化为字符串比较，保证不抛异常。

    同版本号的正式版须排在预发布版之前：只按数字排会让 0.111.0-rc.1 解析成
    [0,111,0,1] 从而压过 0.111.0 的 [0,111,0]，令 rc 长期占据列表首位、把
    下载直链指向预发布包。
    """
    core, _, pre = version.partition("-")
    nums = [int(p) for p in re.findall(r"\d+", core)]
    return (nums, 0 if pre else 1, version)


def upsert(entry: dict) -> tuple[bool, dict]:
    """插入或覆盖版本条目，按版本号降序保存。

    返回 (是否有实际变更, 最终落库的条目)。后者供日志区分"只写了版本号"与
    "空 notes 被保护、沿用了旧内容"这两种同样是 0 条解析结果的情况。
    """
    with open(RELEASES_JSON, encoding="utf-8") as f:
        releases = json.load(f)

    existing = next((r for r in releases if r.get("version") == entry["version"]), None)

    # 空的更新说明不覆盖已有内容：定时兜底每天都会重跑同一个 tag，若那次没能
    # 解析出标记块（body 被改动、格式变化等），不该把先前同步到的条目抹空。
    if existing and not entry["notes"] and existing.get("notes"):
        entry = {**entry, "notes": existing["notes"]}

    if existing == entry:
        return False, entry

    releases = [r for r in releases if r.get("version") != entry["version"]]
    releases.append(entry)
    releases.sort(key=lambda r: version_key(r.get("version", "")), reverse=True)

    with open(RELEASES_JSON, "w", encoding="utf-8", newline="\n") as f:
        json.dump(releases, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return True, entry


if __name__ == "__main__":
    main()
