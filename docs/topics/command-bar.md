# 命令直通车

命令直通车 (Command Bar) 是清风输入法的高阶能力, 让短语 / 用户词库 / 系统词库的条目能在选中时**执行带副作用的动作** —— 打开 URL、启动程序、模拟按键、写入剪贴板、加词到用户库、切换输入法状态等。把输入法从"纯打字工具"延伸为"快捷命令启动器"。

[[toc]]

## 简介

### 适用场景

- 输入编码 `cobd` → 选中候选 → 用默认浏览器打开 baidu.com
- 输入 `cojk` → 选中 → 直接输出 `「」` 并把光标停在中间
- 输入 `coac` → 选中 → 把剪贴板内容加入用户词库
- 输入 `cozd` → 选中 → 用汉典查询上一次上屏的词
- 输入 `coen` → 选中 → 切换中英文模式

### 与普通短语的关系

普通短语只能"展开成文本上屏" (如 `date = $Y-$MM-$DD` → 上屏 `2026-05-15`)。命令直通车在此基础上**新增动作执行能力**, 通过短语 / 词库内容中的特殊 marker (以 `$` 开头) 触发。

普通文本短语、模板短语 (`$Y` `$M` 等)、命令短语 (`$CC` `$CC1`)、字符组 (`$AA`) 共用同一个 `text` 字段, 仅靠内容形式区分类型。

## 三种 Marker

### `$CC` — 命令, 仅精确匹配

```
$CC(显示名, 动作1, 动作2, ...)
```

- 用户输入完整编码时 (例如 `cobd`) 出现在候选区
- **不会**在前缀输入时 (例如 `co` 或 `cob`) 显示
- 适合: 高频但不常和码表字混合的命令

示例:

```
cobd = $CC("打开百度", open("https://baidu.com"))
```

### `$CC1` — 命令, 精确 + 前缀都显示

```
$CC1(显示名, 动作1, 动作2, ...)
```

- 用户输入完整编码时显示
- **同时**在前缀输入时也显示 (`co` 看得到, `cob` 也看得到)
- 适合: 希望让用户在输入过程中"发现"的命令

示例:

```
cobd = $CC1("打开百度", open("https://baidu.com"))
```

### `$AA` — 字符组

```
$AA(组名, 字符列表)
```

- 用户输入完整编码 (例如 `zzbd`) → 候选区**展开为 N 个独立单字符**, 每个字符为一条候选
- 用户输入前缀编码 (例如 `zz`) → 候选区显示 **1 条导航候选**, 文字是组名 (如"标点"), 选中后可以二级选择
- 适合: 符号集 (标点、希腊字母、单位符号等)

示例:

```
zzbd = $AA("标点", "、。·ˉˇ¨〃々—~‖…")
```

输入 `zz` → 看到"标点 (bd)"导航; 输入 `zzbd` → 看到 `、 。 · ˉ ǔ ¨ 〃 々 — ~ ‖ …` 12 条候选。

## 编写位置

命令直通车短语可以放在任一支持的 dict 层中, 三处都自动解析:

| 位置 | 是否全局 | 备注 |
|---|---|---|
| 快捷短语 | **全局**, 跨方案有效 | 设置 → 词库 → 短语 |
| 用户词库 | 仅当前方案 | 设置 → 词库 → 方案 → 用户词库 |
| 系统词库 | 仅当前方案 | 设置 → 词库 → 方案 → 系统词库 (大部分场景不直接编辑) |

::: tip
推荐**绝大部分命令放快捷短语**, 因为跨方案 (拼音/五笔/混输) 都可用。
用户词库适合方案专属的命令 (如某个五笔编码特定行为)。
:::

## 语法

### 基础

`$CC` / `$CC1` 内部是表达式 (expr), 表达式只有 **3 种形态**:

| 形态 | 例子 |
|---|---|
| 字面量 | `"hello"`, `42`, `3.14` |
| 标识符 | `last`, `now`, `code` (等价零参调用 `last()` / `now()` / `code()`) |
| 函数调用 | `open("https://...")`, `clip.copy("x")`, `key.tap("Enter")` |

### 字符串内插

字符串中可用 `{expr}` 内插任意子表达式:

```
$CC("百度搜 {clip()}", open("https://baidu.com/s?wd={url(clip())}"))
```

display 显示 "百度搜 <剪贴板内容>"; 选中后浏览器打开搜索页。

### `$$` 转义

如果要输出字面 `$` 字符, 用 `$$`:

```
text = "价格: $$10"
```

显示 `价格: $10` (没有 `$$` 写法时, `$10` 会被尝试匹配模板变量)。

### `.` 仅用于函数命名空间

`.` 只用作函数名命名空间分隔符, 例如 `clip.copy(...)`, `key.tap(...)`, `dict.addword(...)`。不能用于"变量取属性"或"索引"。

| 错误 | 正确 |
|---|---|
| `last.1` | `last(1)` |
| `last.1.url` | `url(last(1))` |
| `code.length` | `len(code)` |

## 函数清单

所有函数都返回字符串 (动作函数返回空字符串)。下列表格统一使用以下记号:

- `n` / `int` — 整数
- `s` / `str` — 字符串
- 参数后带 `?` 表示可选

### 取值函数 (纯函数, 返回字符串快照)

| 函数 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `code()` | (无) | `str` | 触发候选时的输入编码 (例如 `cobd`) |
| `code(n)` | `n: int` | `str` | 触发编码从第 n 字符 (1 起) 切到末尾 |
| `tail(s, n)` | `s: str, n: int` | `str` | 任意字符串 s 从第 n 字符 (1 起) 切到末尾 |
| `last()` | (无) | `str` | 最近一次上屏的文本 |
| `last(n)` | `n: int` | `str` | 倒数第 n 次上屏文本, n ≥ 1; 历史不足时返回空串 |
| `clip()` | (无) | `str` | 当前系统剪贴板文本 |
| `clip(n)` | `n: int` | `str` | 剪贴板历史第 n 条 (1 起, 最多 9 条) |
| `sel()` | (无) | `str` | 当前应用中选中的文本 (stub, 占位返回空串) |
| `app()` | (无) | `str` | 当前前台进程名, 例如 `chrome.exe` |
| `title()` | (无) | `str` | 当前前台窗口标题 |
| `date(fmt)` | `fmt: str` | `str` | 日期, fmt 用 `YYYY MM DD HH mm ss` 等别名 |
| `date(fmt, offset)` | `fmt: str, offset: str` | `str` | 带偏移的日期, offset 形如 `"+1d"` `"-2w"` `"+3M"` `"-1y"` |
| `time()` | (无) | `str` | 当前时间, 默认 fmt = `"HH:mm:ss"` |
| `time(fmt)` | `fmt: str` | `str` | 自定义时间格式 |
| `now()` | (无) | `str` | 等价 `date("YYYY-MM-DD HH:mm:ss")` |
| `env(name)` | `name: str` | `str` | 环境变量, 例如 `env("USERNAME")` |

### 文本处理 (纯函数)

| 函数 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `len(s)` | `s: str` | `str` (数字) | 字符数, 按 rune 计 |
| `upper(s)` | `s: str` | `str` | 全部转大写 |
| `lower(s)` | `s: str` | `str` | 全部转小写 |
| `trim(s)` | `s: str` | `str` | 去首尾空白 |
| `trim(s, chars)` | `s: str, chars: str` | `str` | 去首尾的指定字符 |
| `sub(s, start)` | `s: str, start: int` | `str` | 切片到末尾, 索引 1 起, 支持负数 |
| `sub(s, start, end)` | `s: str, start: int, end: int` | `str` | 切片 [start, end] 双闭区间, 索引 1 起, 支持负数 |
| `replace(s, old, new)` | `s: str, old: str, new: str` | `str` | 字面替换 |
| `regex(s, pat, rep)` | `s: str, pat: str, rep: str` | `str` | 正则替换, Go RE2 语法 |
| `split(s, sep, n)` | `s: str, sep: str, n: int` | `str` | 按 sep 拆分, 取第 n 段 (1 起, 支持负数从末尾计) |
| `concat(...)` | `... : str` | `str` | 字符串拼接, 0 个参数返回空串 |
| `reverse(s)` | `s: str` | `str` | 反转, 按 rune |
| `url(s)` | `s: str` | `str` | URL 百分号编码 (component) |
| `html(s)` | `s: str` | `str` | HTML 实体编码 |
| `json(s)` | `s: str` | `str` | JSON 字面量化 (含两端引号) |
| `base64(s)` | `s: str` | `str` | Base64 编码 |
| `default(s, fallback)` | `s: str, fallback: str` | `str` | s 为空时返回 fallback |
| `t2s(s)` | `s: str` | `str` | 繁→简 (stub, 占位原样返回) |
| `s2t(s)` | `s: str` | `str` | 简→繁 (stub, 占位原样返回) |
| `pinyin(s)` | `s: str` | `str` | 汉字转拼音 (stub, 占位原样返回) |

### 计算

| 函数 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `calc(expr)` | `expr: str` | `str` (数字) | 数学表达式求值, 支持 `+ - * / % ( )`, 浮点; 空输入静默返回空串 |
| `num(s, base)` | `s: str, base: int` | `str` | 进制转换 (2/8/10/16), 例 `num("0xff", 10)` → `"255"` |

### 内省

| 函数 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `help(name)` | `name: str` | `str` | 返回指定函数的简介; 查不到时返回空串。供 cmdbar-repl / 设置面板浏览函数手册使用 |

### 动作函数 (有副作用, 返回空串)

::: tip 命名宪法 (2026-05-16)
动作函数已统一为 `namespace.verb` 形式: `run` → `proc.run`, `shell` → `proc.shell`, `search` → `web.search`, `dict.addword` → `dict.add`, `ime.setting` → `setting.open`。**旧名仍可用** (注册为 deprecated alias, Eval 复用同一实现), 现有 yaml 不需立刻迁移; 新写短语推荐用新名。
:::

| 函数 (新名) | 旧名 / 别名 | 参数 | 副作用 | 说明 |
|---|---|---|---|---|
| `type(s)` | — | `s: str` | 上屏文本 | 经 TSF 输入, 不污染剪贴板。**特殊**: 解析期被 eval 拦截为 ActionText, 经 InsertText 落字 |
| `open(target)` | — | `target: str` | 打开 URL / 文件 / 程序 | http(s) 走默认浏览器, 其他走 ShellExecute |
| `proc.run(cmd, ...args)` | `run` | `cmd: str, args: str...` | 启动进程 | 异步, 不等待返回 |
| `proc.shell(cmdline)` | `shell` | `cmdline: str` | 执行 shell 命令 | 默认 `cmd /c`, 静默无窗口 |
| `proc.shell(cmdline, flags)` | `shell` | `cmdline: str, flags: str` | 执行 shell 命令 | flags 控制 shell 类型与窗口, 见下表 |
| `key.tap(combo)` | — | `combo: str` | 单次按键 | 例 `"Enter"` `"Shift+End"` `"Ctrl+C"` `"vk:0x5D"` |
| `key.seq(...combos)` | — | `combos: str...` | 按键序列 | 按顺序依次触发 |
| `key.hold(combo)` | — | `combo: str` | 按下不抬起 | 需与 `key.release` 成对使用, 否则按键会卡住 |
| `key.release(combo)` | — | `combo: str` | 抬起按键 | 释放 `key.hold` 按下的键, 顺序与 hold 相反 |
| `key.type(text)` | — | `text: str` | Unicode 直输文本 | 以扫描码发送, 绕过键盘布局; 与 `type()` 不同, 走 SendInput 而非 TSF |
| `clip.copy(s)` | — | `s: str` | 写入剪贴板 | 覆盖现有剪贴板 |
| `clip.paste()` | — | (无) | 粘贴 | 模拟 Ctrl+V |
| `dict.add(s)` | `dict.addword` | `s: str` | 加词到用户库 | 编码按当前方案规则自动推导 |
| `dict.add(s, code)` | `dict.addword` | `s: str, code: str` | 加词到用户库 | 指定编码 |
| `ime.toggle(target)` | — | `target: str` | 切换输入法状态 | target ∈ `"cn-en"` / `"fullshape"` / `"layout"` / `"candwin"` |
| `setting.open(page)` | `ime.setting` | `page: str` | 打开设置页 | page 为空打开默认页 |
| `web.search(engine, q)` | `search` | `engine: str, q: str` | 打开搜索结果页 | engine ∈ `"baidu"` / `"bing"` / `"google"` / `"zdic"` |

#### `proc.shell` flag 字符串

`proc.shell(cmd, flags)` 第二参数是 flag 集合 (逗号分隔), 控制 shell 类型 + 窗口可见性:

| flag | 含义 |
|---|---|
| (空 / 省略) | `cmd /c`, 静默无窗口 |
| `term` | `cmd /k`, 弹可见 console |
| `pwsh` | `pwsh.exe` (找不到则 fallback `powershell.exe`), 静默 |
| `pwsh,term` | pwsh 可见 |

示例:

```
$CC("ping (静默)", proc.shell("ping -n 1 baidu.com"))
$CC("ping (可见)", proc.shell("ping -n 1 baidu.com", "term"))
$CC("PS 命令",   proc.shell("Get-Process | Out-File ~/procs.txt", "pwsh"))
```

### 按键参考

`key.tap` / `key.seq` / `key.hold` / `key.release` 中的 `combo` 字符串格式为:

```
[修饰键+]...[修饰键+]主键
```

大小写不敏感, `+` 为分隔符, 修饰键顺序会自动规范化为 `Ctrl < Shift < Alt < Win`。

#### 修饰键

| 规范名 | 可接受别名 | Windows VK |
|--------|-----------|-----------|
| `Ctrl` | `Control` | VK_CONTROL (0x11) |
| `Shift` | — | VK_SHIFT (0x10) |
| `Alt` | `Menu` | VK_MENU (0x12) |
| `Win` | `Super`, `Meta`, `Cmd` | VK_LWIN (0x5B) |

#### 控制 / 导航键

| 规范名 | 可接受别名 | VK 码 | 说明 |
|--------|-----------|-------|------|
| `Enter` | `Return` | 0x0D | 回车 |
| `Tab` | — | 0x09 | 制表符 |
| `Escape` | `Esc` | 0x1B | 退出 |
| `Space` | — | 0x20 | 空格 |
| `Backspace` | `Back` | 0x08 | 退格 |
| `Delete` | `Del` | 0x2E | 删除 |
| `Insert` | `Ins` | 0x2D | 插入 |
| `Home` | — | 0x24 | 行首 |
| `End` | — | 0x23 | 行尾 |
| `PageUp` | `Page_Up`, `Prior` | 0x21 | 上翻页 |
| `PageDown` | `Page_Down`, `Next` | 0x22 | 下翻页 |
| `Up` | `ArrowUp` | 0x26 | 上方向键 |
| `Down` | `ArrowDown` | 0x28 | 下方向键 |
| `Left` | `ArrowLeft` | 0x25 | 左方向键 |
| `Right` | `ArrowRight` | 0x27 | 右方向键 |
| `CapsLock` | — | 0x14 | 大写锁定 |
| `PrintScreen` | `PrtSc` | 0x2C | 截图键 |
| `ScrollLock` | — | 0x91 | 滚动锁定 |
| `Pause` | — | 0x13 | 暂停键 |

#### 功能键

| 规范名 | VK 码 | 规范名 | VK 码 |
|--------|-------|--------|-------|
| `F1` | 0x70 | `F13` | 0x7C |
| `F2` | 0x71 | `F14` | 0x7D |
| `F3` | 0x72 | `F15` | 0x7E |
| `F4` | 0x73 | `F16` | 0x7F |
| `F5` | 0x74 | `F17` | 0x80 |
| `F6` | 0x75 | `F18` | 0x81 |
| `F7` | 0x76 | `F19` | 0x82 |
| `F8` | 0x77 | `F20` | 0x83 |
| `F9` | 0x78 | `F21` | 0x84 |
| `F10` | 0x79 | `F22` | 0x85 |
| `F11` | 0x7A | `F23` | 0x86 |
| `F12` | 0x7B | `F24` | 0x87 |

#### 标点符号键 (美式 US 布局)

| 规范名 | 字符别名 | VK 码 | 键位说明 |
|--------|---------|-------|---------|
| `Grave` | `` ` ``, `~`, `Backtick` | 0xC0 | 反引号 / 波浪号键 |
| `Minus` | `-` | 0xBD | 减号 / 下划线键 |
| `Equal` | `=`, `Plus` | 0xBB | 等号 / 加号键 |
| `LBracket` | `[`, `Open_Bracket` | 0xDB | 左方括号键 |
| `RBracket` | `]`, `Close_Bracket` | 0xDD | 右方括号键 |
| `Backslash` | `\` | 0xDC | 反斜杠键 |
| `Semicolon` | `;` | 0xBA | 分号键 |
| `Quote` | `'` | 0xDE | 单引号键 |
| `Comma` | `,` | 0xBC | 逗号键 |
| `Period` | `.` | 0xBE | 句号键 |
| `Slash` | `/` | 0xBF | 斜杠键 |

::: warning
标点符号键的 VK 码基于美式 US 键盘布局。非 US 布局下物理键位可能不同，此时建议改用 `vk:` 数值码指定精确的虚拟键值。
:::

#### 字母与数字键

字母 `a`–`z`（大小写等价）和数字 `0`–`9` 直接作为键名使用。字母键的 VK 码由 Win32 `VkKeyScanW` 按当前键盘布局动态查询，无固定值。

#### `vk:` 数值码

当需要输入上表未列出的特殊键（如小键盘键、多媒体键、右键菜单键等），可使用 `vk:` 前缀直接指定 Windows 虚拟键值：

| 写法 | 解析方式 | 示例 |
|------|---------|------|
| `vk:0x5D` | `0x` 前缀 → 十六进制 | 右键菜单键 (VK_APPS) |
| `vk:93` | 无前缀 → 十进制 | 同上 (93 = 0x5D) |

两种写法等价，可混用：

```
# 右键菜单键
key.tap("vk:0x5D")
key.tap("vk:93")

# 带修饰键
key.tap("Shift+vk:0x5D")

# 数字小键盘 0 (VK_NUMPAD0 = 0x60)
key.tap("vk:0x60")

# 媒体播放/暂停 (VK_MEDIA_PLAY_PAUSE = 0xB3)
key.tap("vk:0xB3")
key.tap("vk:179")
```

有效范围：`0x01`–`0xFF` (1–255)，值为 0 或超出范围时报错。

#### 组合示例

```
key.tap("Ctrl+C")              # 复制
key.tap("Ctrl+Shift+End")      # 选到文档末尾
key.tap("Alt+F4")              # 关闭窗口
key.tap("Win+D")               # 显示桌面
key.seq("Home", "Shift+End", "Delete")  # 删除整行
key.hold("Shift")              # 按住 Shift（需配对 release）
key.release("Shift")           # 释放 Shift
key.type("Hello, 世界")         # Unicode 直输，不依赖键盘布局
```

## 权重

命令直通车短语的权重设置与普通短语相同, 取值 0 ~ 10000, 默认 1000。详细分档建议、与混输模式的关系等参见 [权重系统](./weight-system)。

::: tip
- 希望命令稳定置顶 (例如 `coen` 切中英) → weight = 8000+
- 默认值 1000 适合"和码表字混排"
- 仅在精确编码下偶尔出现 → weight ≤ 500
:::

## 前缀匹配规则

| 内容形态 | 前缀匹配 (输入未完整) | 精确匹配 |
|---|---|---|
| 普通字面短语 (无 `$`) | ✓ 显示 | ✓ 显示 |
| 模板短语 (含 `$Y` / `$M` 等) | ✗ 不显示 | ✓ 显示 |
| `$CC(...)` | ✗ 不显示 | ✓ 显示 |
| `$CC1(...)` | ✓ 显示 | ✓ 显示 |
| `$AA(...)` | ✓ 导航候选 (组名) | ✓ 展开 N 字符 |

模板短语 (如 `date = $Y-$MM-$DD`) **不会**在 `d` / `da` / `dat` 时显示, 避免污染前缀候选。

## 实用示例

### 打开 URL

```
cobd = $CC("打开百度", open("https://baidu.com"))
cogh = $CC("打开 GitHub", open("https://github.com"))
```

### 搜索剪贴板 / 历史词

由于触发码只能是英文字母, 命令直通车从**剪贴板**或**上次上屏文本**取查询内容:

```
cobs = $CC("百度搜 · {clip()}",  search("baidu", clip()))
cogs = $CC("Google · {clip()}", search("google", clip()))
cozd = $CC("汉典 · {last()}",   open("https://www.zdic.net/hans/{url(last())}"))
```

典型用法: 先复制要搜的词 → 输入 `cobs` → 选中候选 → 浏览器打开搜索页。

### 配对符号 + 光标回中

```
cojk = $CC("「」", type("「」"), key.tap("Left"))
cojb = $CC("()",   type("()"),   key.tap("Left"))
```

输入 `cojk` → 选中后输出 `「」`, 紧接着自动按 Left 让光标停在中间。

### 删除当前行

```
codl = $CC("[删行]", key.seq("Home", "Shift+End", "Backspace"))
```

### 启动程序

```
cono   = $CC("打开记事本",      proc.run("notepad.exe"))
cocode = $CC("打开 VS Code 项目", proc.run("code.exe", "D:\\my\\project"))
```

### 加词到用户库

```
coac = $CC("加词 · {clip()}", dict.add(clip()))
coal = $CC("收藏 · {last()}", dict.add(last()))
```

输入 `coac` (剪贴板里是"清风输入法") → 候选显示"加词 · 清风输入法" → 选中后写入用户词库 (编码自动生成)。

### 重复上次输入

```
coll = $CC(last(), type(last()))
```

输入 `coll` → 候选显示上次上屏的词 → 选中后再次输出。

### 切换输入法状态

```
coen = $CC("切中英",   ime.toggle("cn-en"))
cofs = $CC("切全半角", ime.toggle("fullshape"))
coly = $CC("切布局",   ime.toggle("layout"))
cocw = $CC("切候选窗", ime.toggle("candwin"))
coss = $CC("打开设置", setting.open(""))
```

### 字符组

```
zzbd = $AA("标点", "、。·ˉˇ¨〃々—~‖…")
zzsx = $AA("数学", "＋－＜＝＞±×÷∈∏∑")
zzhb = $AA("货币", "＄￠￡￥¤")
```

输入 `zz` → 看到"标点 / 数学 / 货币"3 条导航; 输入 `zzbd` → 看到 12 条标点字符。

### 计算剪贴板表达式

```
coca = $CC("={calc(clip())}", type(calc(clip())))
```

先把 `1+2*3` 复制到剪贴板, 然后输入 `coca` → 候选显示"=7" → 选中后输出 `7`。

### 日期 / 时间快照

```
cody = $CC("{date(\"YYYY-MM-DD\")}",          type(date("YYYY-MM-DD")))
coym = $CC("{date(\"YYYY-MM-DD\", \"+7d\")}", type(date("YYYY-MM-DD", "+7d")))
```

## 限制与注意事项

### 数字键会触发选词

五笔 / 拼音模式下, 数字键 1-9 默认绑定为"选中第 N 候选"。这意味着触发码**不能包含数字**, 否则数字键会让候选立即上屏, 永远到不了 phrase 层查询。

```
# 错误 (1 会被选词逻辑吃掉)
co1 = $CC("打开百度", open("https://baidu.com"))

# 正确
cobd = $CC("打开百度", open("https://baidu.com"))
```

### 中文标点被键事件层拦截

中文标点 (如 `《》` `，` `。` `？`) 在 key event 阶段就被转换成对应的中文符号, **不进入** phrase 层查询。因此**不能**用中文标点作为触发码。

```
# 错误 (《 永远到不了 phrase)
《 = $CC("《》", type("《》"), key.tap("Left"))

# 正确
cojk = $CC("「」", type("「」"), key.tap("Left"))
```

### 触发码只能是英文字母

作为中文输入法, 用户输入的 "编码 (code)" 只能包含 ASCII 字母 (五笔为 a-z, 拼音同), **不可能**在编码中混入汉字。所以"在触发码后面跟一段查询词"这种用法 (例如 `cobs清风输入法` 直接搜"清风输入法") 不成立 —— 应改用 `clip()` / `last()` 等数据源。

### 模板变量需要 `$$` 转义

如果短语 / 词库内容中需要字面 `$` 字符, 必须用 `$$`:

```
# 错误: $M 会被替换为当前月份
text = "工资: $M"

# 正确
text = "工资: $$M"
```

### 部分函数尚未实现

下列函数当前是占位实现, 调用后返回原串或空字符串, 计划在未来版本补全:

- `sel()` — 读取当前选区
- `t2s(s)` / `s2t(s)` — 繁简转换
- `pinyin(s)` — 汉字转拼音

### 命令直通车候选不污染历史

`last()` 返回的是"最近一次上屏的文本"。对于命令直通车候选:

- 有 `type()` 动作 (有文本上屏): 进入 `last()` 历史
- 仅 effect 动作 (如 `open` / `proc.run`): **不**进入历史, 避免 display 文字污染

例如 `cozd = $CC("汉典 · {last()}", open(...))` 选中后, 浏览器打开但**不会**让"汉典 · X"进入历史; 下次再用 `cozd` 仍然查询真正的上次上屏文本。

### 数组未展开时的候选行为 (nav)

输入 group 编码的**前缀** (例如 zzbd 字符组下输入 `zz` / `zzb`), 候选区显示的是"导航条目" (文字是组名, 例如"标点"), **不是**可上屏的字符。在 nav 候选高亮时:

- **空格 / 数字键选中** → 替换输入为完整 group code (如 `zzbd`), 候选区展开为 N 个字符成员
- **标点键 (顶字模式)** → 标点被吞掉, **不上屏**也**不出标点**, 等用户先选 nav 进入展开
- **以词定字键 (Tab 等)** → 同上, 直接 Consumed

这一行为是为了避免上屏"组名+标点"这种无意义文本。

### 字符组成员展开顺序

`$AA("标点", "、。·...")` 中字符的顺序就是候选区展开的顺序 (从左到右)。同 code 多个 group 时, 每个 group 独立排序, 进入 group 后只看到该组的成员。

### 用户词库 cmdbar marker 仅精确码匹配

cmdbar marker (`$CC` / `$CC1` / `$AA` / `$SS`) 写在**用户词库**中也能识别, 但**仅精确码命中**触发, **不**支持前缀导航 (`$CC1` 的前缀展示在用户词库下也仅精确码)。若需要前缀 nav 体验 (如 `zz` → "字符数组" 导航), 请把短语写到**快捷短语词库** (PhraseLayer) — 该层支持完整的前缀 / 多 group 语义。

### 临时拼音模式下短语命令被屏蔽

进入临时拼音模式 (五笔方案下按 `` ` `` 等触发键、或在快捷输入 `;` 之后输字母进入临时拼音子模式) 时, **不会**匹配快捷短语 / 用户词库中的 cmdbar marker。例如临时拼音里输 `zzbd` 看到的是 "祖祖辈辈" 等拼音简拼候选, 而非"标点" / "字符数组" 短语 nav。

这是为了让临时拼音的输入流回归"纯拼音"语义, 避免短语码意外拦截。简拼 (`zg` → "中国") 仍然保留。

### 拼音分步确认 + 命令直通车

拼音逐字确认 (例如输 `nihaorq` 时先选"你好") 累积的已确认段, 在选中后续的 cmdbar 命令时**会**连同命令一起上屏:

- 选有文本的命令 (`rq = $CC("日期", type(date("YYYY-MM-DD")))`): 上屏 `你好2026-05-19`
- 选纯副作用命令 (`cobd = $CC("打开百度", open(...))`): 上屏 `你好`, 然后异步执行打开百度

cmdbar 的 display 文本仍**不**进入历史, 但分步段会进入 (它本身就是用户产出的文本)。

## 内置示例短语

系统短语包内置了 22 条以 `co` 开头的示例命令, 覆盖各类典型场景。用户可在 设置 → 词库 → 短语 中浏览。

完整设计文档见项目仓库 `docs/design/2026-05-12-command-bar-design.md`。

## 编辑入口

打开 设置 → 词库 → 短语 → "+ 添加" / 选中一条 → "编辑":

- **类型** 下拉: 普通 / 命令·打开 / 命令·手动 / 数组
  - 普通: 单一文本框 (字面 / 模板)
  - 命令·打开: 表单式 (显示名 + URL/程序/文件子类 + 路径 + 参数 + 前缀展开)
  - 命令·手动: 自由写 `$CC(...)` 或 `$CC1(...)`
  - 数组: 名称 + 字符列表 (合成 `$AA(...)`)
- **预览**: 输入内容实时显示解析结果 (命令 / 字符组 / 模板 / 字面值 / 错误)
- **权重**: 0 ~ 10000, 默认 1000, 详见 [权重系统](./weight-system)
- **连续添加**: 添加场景下可勾选, 保存后保留对话框继续加

用户词库的"添加用户词条"对话框使用同样的表单, 额外提供编码自动生成 (拼音方案下根据词语生成拼音编码)。

## 相关参考

- [权重系统](./weight-system) — 候选排序的统一规则
- [词库管理 (设置 → 词库)](../settings/dictionary)
- [快速入门](../guide/install)
