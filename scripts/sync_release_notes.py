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

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
)
RELEASES_JSON = os.path.join(DATA_DIR, "releases.json")

# 在线更新元信息。构建期原样拷进 out/latest.json，对外仍以
# dl.windinput.com/latest.json 提供（见 scripts/gen-dist-files.mjs）。
#
# 从前这个文件由主仓 CI 推到 R2。挪到文档站是因为：它只有几百字节，却让 R2
# 变成了在线更新的必经之路——而 R2 在部分区域完全不可达时，用户不是「更新慢」
# 而是「永远收不到新版本」。内容全部来自 GitHub Release JSON（本脚本已有的
# 输入），不需要任何额外网络请求，那就没有理由让它单独占一条存储链路。
LATEST_JSON = os.path.join(DATA_DIR, "latest.json")

# 对外的下载域名。安装包仍在 R2（经 EdgeOne 前置），latest.json 与发布说明
# 改由文档站产出，但**对外 URL 一律保持不变**——老版本客户端里这些地址是
# 硬编码的，换域名等于把存量用户的在线更新一次性切断。
DL_BASE = "https://dl.windinput.com"

USER_START = "<!-- user-facing:start -->"
USER_END = "<!-- user-facing:end -->"

# 标记行前允许有缩进或列表符号：v0.118.0 的 Release body 把结束标记写成了
# `- <!-- user-facing:end -->`（编辑时并进了上一条列表项），严格匹配整段落空，
# 最终只同步到版本号。标记是 HTML 注释，前面挂什么都不改变它的语义。
_LEAD = r"[ \t]*(?:[-*+]\s+)?"
MARKER_BLOCK_RE = re.compile(
    rf"{re.escape(USER_START)}[ \t]*\n(.*?)\n{_LEAD}{re.escape(USER_END)}",
    re.DOTALL,
)


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
    body = release.get("body") or ""
    section = extract_user_section(body)
    notes = to_notes(section) if section else []
    if not notes:
        print(f"v{version} 没有可用的用户向更新说明，只写版本号。")
        if marker_block_broken(body):
            report_malformed(version)

    entry = {"version": version}
    if date:
        entry["date"] = date
    entry["notes"] = notes

    changed, written = upsert(entry)
    print(f"{'已更新' if changed else '无变化'}：v{version}（{len(written['notes'])} 条）")

    sync_latest(release, version)


def sync_latest(release: dict, version: str) -> None:
    """把最新版的在线更新元信息写进 data/latest.json。

    只在同步的**确实是最新版**时才写：workflow_dispatch 可以指定任意 tag 补同步
    某个旧版本的更新说明，那种情况下改 latest.json 会把全体用户的在线更新指回旧版。
    判据取 upsert 之后的 releases.json 首项——排序规则（正式版压过同号预发布版）
    只实现在 version_key 一处，这里复用它而不是另写一遍比较。
    """
    with open(RELEASES_JSON, encoding="utf-8") as f:
        newest = json.load(f)[0].get("version")
    if version != newest:
        print(f"v{version} 不是最新版（当前 v{newest}），跳过 latest.json。")
        return

    latest = build_latest(release, version)
    if latest is None:
        # 安装包还没传完就触发了 dispatch 时会走到这里。保留旧的 latest.json：
        # 指向上一个可用版本，远好过写出一个 exeUrl 404 的新文件。
        print(
            f"::warning::v{version} 的 Release 里找不到 {setup_name(version)}，"
            "latest.json 保持不变。安装包上传完成后重跑本工作流即可。",
            file=sys.stderr,
        )
        return

    if os.path.exists(LATEST_JSON):
        with open(LATEST_JSON, encoding="utf-8") as f:
            if json.load(f) == latest:
                print("latest.json 无变化。")
                return

    with open(LATEST_JSON, "w", encoding="utf-8", newline="\n") as f:
        json.dump(latest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"已更新 latest.json → v{version}")


def setup_name(version: str) -> str:
    """Windows 安装包文件名。口径与 worker/src/env.ts 的 ARTIFACTS 正则一致。"""
    return f"WindInput-Setup-{version}.exe"


def build_latest(release: dict, version: str) -> dict | None:
    """从 Release 的 assets 组装 latest.json；找不到 Windows 安装包时返回 None。

    **字段与线上现有的 latest.json 逐字段对齐，一个都不能少、不能改名**——
    存量客户端按这个结构解析，多写无妨，少写或改名就是解析失败。

    sha256 与 size 直接取 GitHub 给的 asset 元数据：`digest` 字段的值形如
    `sha256:657893…`，与主仓打包时算出、随 .sha256 文件一同发布的值同源。
    因此本脚本不需要下载任何 asset，纯从传入的 Release JSON 组装。
    """
    want = setup_name(version)
    asset = next((a for a in release.get("assets", []) if a.get("name") == want), None)
    if asset is None:
        return None

    digest = asset.get("digest") or ""
    sha256 = digest.split(":", 1)[1] if digest.startswith("sha256:") else ""

    return {
        "version": version,
        "tag": release.get("tag_name") or f"v{version}",
        "channel": channel_of(version),
        "exeUrl": f"{DL_BASE}/{want}",
        "sha256": sha256,
        "size": asset.get("size", 0),
        "releaseNotesUrl": f"{DL_BASE}/WindInput-{version}-Release.md",
        "publishedAt": release.get("published_at", ""),
    }


def channel_of(version: str) -> str:
    """发布通道。取自版本号后缀，**不用 Release 的 prerelease 标记**——
    主仓的正式发布一直带着那个标记（见 sync-changelog.yml 里的说明），
    按它判断会把每个正式版都标成预发布。"""
    _, _, pre = version.partition("-")
    if not pre:
        return "stable"
    head = re.split(r"[.\-]", pre)[0].lower()
    return head if head in ("alpha", "beta", "rc") else "stable"


def extract_user_section(body: str) -> str | None:
    """取出 Release body 中的用户向段落。"""
    m = MARKER_BLOCK_RE.search(normalize(body))
    if m:
        content = m.group(1).strip()
        # 主仓的 Release 模板里留了占位文本，未编辑时不应同步
        if re.match(r"^\s*>?\s*暂未填写", content):
            return None
        return content

    # 旧格式兼容：`## 更新记录` 到 `---` 分隔符
    m = re.search(r"\n## 更新记录\n(.*?)(?:\n---(?:\n|$)|$)", normalize(body), re.DOTALL)
    if m:
        return m.group(1).strip()

    return None


def normalize(body: str) -> str:
    return (body or "").replace("\r\n", "\n").replace("\r", "\n")


def marker_block_broken(body: str) -> bool:
    """body 里有 user-facing 标记，却拼不出一个成对的标记块。

    区别于"标记块在、内容是占位文本"——那是主仓还没写更新说明的正常状态，
    标记块本身完好，MARKER_BLOCK_RE 能匹配上，不算故障。
    """
    body = normalize(body)
    if USER_START not in body and USER_END not in body:
        return False
    return not MARKER_BLOCK_RE.search(body)


def report_malformed(version: str) -> None:
    """标记块坏了：照常写版本条目，但要让 CI 显式报出来。

    这里不 exit 1——版本号仍要进仓库，下载页的直链不该被更新日志的格式问题卡住。
    workflow 拿 malformed 标志在建完 PR 之后再失败，告警和直链两头都不耽误。

    v0.118.0 就是缺了这一步：解析失败只 print 了一行普通日志，workflow 全绿、
    PR 自动合并，故障只在页面上表现为"有版本号、点开没内容"。
    """
    print(
        f"::error::v{version} 的 Release body 里有 user-facing 标记，却解析不出成对的"
        "标记块（缺一侧、顺序颠倒，或标记被并进了别的行）。更新说明未同步，"
        "请检查 Release 正文后重跑本工作流。",
        file=sys.stderr,
    )
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as f:
            f.write("malformed=true\n")


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
