#!/usr/bin/env python3
"""从 GitHub Release body 提取用户向更新说明，插入/更新 changelog。"""

import json
import re
import sys
from datetime import datetime


CHANGELOG = "docs/changelog/index.md"
TITLE = "# 更新记录"
USER_START = "<!-- user-facing:start -->"
USER_END = "<!-- user-facing:end -->"


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <release.json>")
        sys.exit(1)

    with open(sys.argv[1], encoding="utf-8") as f:
        release = json.load(f)

    tag = release.get("tag_name", "")
    version = tag.lstrip("v")
    raw_date = release.get("published_at", "")
    date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).strftime("%Y-%m-%d") if raw_date else "unknown"
    body = release.get("body", "")

    content = extract_user_section(body)
    if not content:
        print(f"No user-facing content for {version}, skipping.")
        return

    entry = format_entry(version, date, content)
    insert_or_update(version, entry)
    print(f"Synced {version}")


def extract_user_section(body: str) -> str | None:
    body = body.replace("\r\n", "\n").replace("\r", "\n")

    # 新格式：user-facing:start/end 标记
    m = re.search(
        rf"{re.escape(USER_START)}\n(.*?)\n{re.escape(USER_END)}",
        body,
        re.DOTALL,
    )
    if m:
        content = m.group(1).strip()
        if not re.match(r"^\s*>?\s*暂未填写", content):
            return content
        return None  # 占位文本，未编辑

    # 旧格式兼容：## 更新记录 到 --- 分隔符
    m = re.search(r"\n## 更新记录\n(.*?)(?:\n---(?:\n|$)|$)", body, re.DOTALL)
    if m:
        return m.group(1).strip()

    return None


def format_entry(version: str, date: str, content: str) -> str:
    return f"## v{version} <span class=\"date\">· {date}</span>\n\n{content}"


def insert_or_update(version: str, entry: str):
    with open(CHANGELOG, encoding="utf-8") as f:
        lines = f.readlines()

    # 查找 "# 更新记录" 标题行
    title_idx = None
    for i, line in enumerate(lines):
        if line.strip() == TITLE:
            title_idx = i
            break

    if title_idx is None:
        print(f"ERROR: '{TITLE}' not found in {CHANGELOG}")
        sys.exit(1)

    # 查找下一个 "## v" 行（即第一个版本条目）
    first_entry_idx = None
    for i in range(title_idx + 1, len(lines)):
        if lines[i].startswith("## v"):
            first_entry_idx = i
            break

    # 检查该版本是否已存在
    entry_lines = entry.split("\n")

    if first_entry_idx is not None:
        # 查找该版本的范围（到下一个 ## v 或文件末尾）
        for i in range(first_entry_idx, len(lines)):
            if re.match(rf"^## v{re.escape(version)}(\s|$)", lines[i]):
                # 找到结束位置
                end_idx = i + 1
                while end_idx < len(lines) and not lines[end_idx].startswith("## v"):
                    end_idx += 1
                # 替换
                lines[i:end_idx] = [l + "\n" for l in entry_lines]
                with open(CHANGELOG, "w", encoding="utf-8") as f:
                    f.writelines(lines)
                return

    # 版本不存在，在标题后插入
    insert_idx = title_idx + 1
    # 跳过标题后的空行
    while insert_idx < len(lines) and lines[insert_idx].strip() == "":
        insert_idx += 1

    new_lines = [l + "\n" for l in entry_lines] + ["\n"]
    lines[insert_idx:insert_idx] = new_lines

    with open(CHANGELOG, "w", encoding="utf-8") as f:
        f.writelines(lines)


if __name__ == "__main__":
    main()
