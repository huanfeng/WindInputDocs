# 配置机制与全局配置

::: warning 高级主题
本文面向需要手动编辑配置文件的用户。普通用户通过[设置工具](/settings/general)即可完成配置，修改即时生效。
:::

## 配置文件位置

| 文件 | 路径 |
|------|------|
| 全局配置 | `%APPDATA%\WindInput\config.toml` |
| 运行时状态 | `%APPDATA%\WindInput\state.toml`（程序自动维护，请勿手改） |
| 方案配置 | `%APPDATA%\WindInput\schemas\*.schema.yaml` |
| 方案覆盖 | `%APPDATA%\WindInput\schema_overrides.toml`（设置工具自动维护） |
| 兼容性规则 | `%APPDATA%\WindInput\compat.toml` |
| 主题文件 | `%APPDATA%\WindInput\themes\` |
| 系统短语 | 程序内置，不可修改 |

## 配置格式

全局配置为 **TOML 格式**，文件首行带版本号：

```toml
version = 1
```

::: info 从旧版本升级
旧版本的配置格式为 YAML（`config.yaml`）。升级后首次启动会自动迁移为 TOML 并转换为新的配置结构，旧文件保留原地不再读取，无需手动处理。
:::

方案配置（`*.schema.yaml`）与主题文件仍为 YAML 格式，不受影响。

## 配置加载机制

配置采用**三层合并**机制，优先级从低到高：

1. **代码默认值** — 程序内置的默认配置
2. **系统预置配置** — 随程序分发的 `data/config.toml`
3. **用户配置** — `%APPDATA%\WindInput\config.toml`

高优先级的配置覆盖低优先级的同名字段。保存时采用 **diff 保存**：仅将与系统默认不同的字段写入用户配置文件，使未修改的字段能自动跟随系统默认值的更新。

::: info
如果你发现用户配置文件中只包含 `version = 1` 和少量字段，这是正常现象——只保存了与默认值不同的项。
:::

## 启动设置

```toml
[general]
remember_last_state = false     # 记忆上次的输入状态
default_chinese_mode = true     # 启动默认中文模式
default_full_width = false      # 启动默认半角
default_chinese_punct = true    # 启动默认中文标点
```

## 输入方案

```toml
[schema]
active = "wubi86"               # 当前使用的方案
# 可切换的方案列表（顺序决定切换顺序）；如需启用拼音/双拼，加入列表并重启
available = ["wubi86", "wubi86_pinyin"]
```

方案详情请参阅[输入方案](/schema/)。

## 快捷键配置 {#快捷键配置}

```toml
[hotkeys]
# 中英文切换键（可多选）：lshift, rshift, lctrl, rctrl, capslock
toggle_mode_keys = ["lshift", "rshift"]
commit_on_switch = true               # 切换中英文时将已有编码上屏
switch_engine = "ctrl+shift+e"        # 切换输入方案
toggle_full_width = "shift+space"     # 全角/半角切换
toggle_punct = "ctrl+."               # 中英文标点切换
delete_candidate = "ctrl+shift+number" # 删除候选词
pin_candidate = "ctrl+number"         # 置顶候选词
toggle_toolbar = 'ctrl+shift+\'       # 显示/隐藏工具栏
open_settings = "ctrl+shift+]"        # 打开设置工具
add_word = "ctrl+equal"               # 快捷加词
toggle_s2t = "ctrl+shift+j"           # 简入繁出开关切换
global_hotkeys = []                   # 注册为全局热键的快捷键名称列表
```

### 全局热键

`global_hotkeys` 可以将指定快捷键注册为系统级全局热键，即使在其他应用聚焦时也能响应。例如：

```toml
[hotkeys]
global_hotkeys = ["switch_engine", "open_settings"]
```

## 输入行为 {#输入行为}

```toml
[input]
punct_follow_mode = false        # 标点是否随中英文模式切换
filter_mode = "smart"            # 候选过滤：smart（智能）, general（通用规范）, gb18030
enter_behavior = "commit"        # Enter 键行为：commit（上屏编码）, clear（清空）
space_on_empty_behavior = "commit" # 空编码按空格：commit（上屏）, clear（清空）
pinyin_separator = "auto"        # 拼音分隔符：auto, quote, backtick, none
smart_punct_after_digit = true   # 数字后智能标点（保持英文标点）
smart_punct_list = ".,:"         # 数字后保持英文的标点列表
numpad_behavior = "direct"       # 数字小键盘功能：direct（直接输入数字）, follow_main（同主键盘）
```

### 选择键与翻页键

```toml
[input]
# 二三候选快捷上屏键（可多选）：semicolon_quote, comma_period, lrshift, lrctrl
select_key_groups = ["semicolon_quote"]
# 以词定字按键（可多选），默认关闭：comma_period, minus_equal, brackets
select_char_keys = []
# 翻页键（可多选）：pageupdown, minus_equal, brackets, shift_tab
page_keys = ["pageupdown", "minus_equal"]
# 候选高亮切换键：arrows（方向键）, tab
highlight_keys = ["arrows", "tab"]
```

### 候选按键溢出行为

当数字键或选择键超出候选范围时，可配置处理策略：

```toml
[input.overflow]
number_key = "ignore"      # 数字键无效时：ignore（忽略）, commit（顶字上屏）, commit_and_input（顶字上屏并输入数字）
select_key = "ignore"      # 二三候选键无效时：ignore, commit, commit_and_input
select_char_key = "ignore" # 以词定字键无效时：ignore, commit, commit_and_input
```

### 临时英文模式

```toml
[input.shift_temp_english]
enabled = true                   # 启用 Shift + 字母临时英文
show_english_candidates = true   # 显示英文候选
shift_behavior = "temp_english"  # temp_english（进入临时英文）或 direct_commit（直接上屏大写字母）
trigger_keys = []                # 符号键触发临时英文（可选）
```

### CapsLock 行为

```toml
[input.capslock]
cancel_on_mode_switch = false    # 切换模式时取消 CapsLock 状态
```

### 临时拼音模式

五笔等非拼音方案下，可通过特定按键触发临时拼音输入：

```toml
[input.temp_pinyin]
trigger_keys = ["backtick"]      # 可选：backtick, semicolon, z
accent_color = ""                # 模式边框强调色（留空使用默认）
```

### 自动配对

```toml
[input.auto_pair]
chinese = true                   # 中文标点自动配对
english = true                   # 英文标点自动配对
blacklist = []                   # 应用黑名单（在这些应用中禁用自动配对）
chinese_pairs = ["（）", "【】", "｛｝", "《》", "〈〉"]  # 中文配对标点
english_pairs = ["()", "[]", "{}", "<>"]                  # 英文配对标点
```

### 自定义标点映射

```toml
[input.punct_custom]
enabled = false                  # 启用自定义标点映射（默认关闭）

# key=源字符（引号用 "1/"2/'1/'2 表示），value=[中文半角, 英文全角, 中文全角]
[input.punct_custom.mappings]
'"1' = ["“", "\"", "“"]  # 左双引号
'"2' = ["”", "\"", "”"]  # 右双引号
```

## 可选功能 {#可选功能}

### 快捷输入

```toml
[features.quick_input]
trigger_keys = ["semicolon"]     # 触发键列表（空列表=关闭）
force_vertical = true            # 强制竖排显示候选
decimal_places = 6               # 计算结果小数保留位数（0 表示取整）
accent_color = ""                # 模式边框强调色（留空使用默认）
```

### 简入繁出

```toml
[features.s2t]
enabled = false                  # 简入繁出总开关
variant = "s2t"                  # 变体：s2t（标准）, s2tw（台湾正体）, s2twp（台湾正体+词汇）, s2hk（香港繁体）
```

### 输入统计

```toml
[features.stats]
enabled = true                   # 启用输入统计
retain_days = 0                  # 数据保留天数（0=永久）
track_english = true             # 统计英文模式输入
```

### 命令直通车

```toml
[features.cmdbar]
candidate_prefix = "⚡"          # 副作用命令候选的前缀符号；设为空串完全关闭
```

### 引导键特殊模式 {#引导键特殊模式}

引导键特殊模式允许通过特定按键进入独立码表输入，适合快符、生僻字等小型专用码表。支持配置多组，每组相互独立。

```toml
[[features.special_modes]]
id = "quick_symbols"             # 模式唯一 ID
name = "快符"                    # 模式徽标显示名
trigger_keys = ["backslash"]     # 引导键（空码时触发，支持多键）
table = "quick_symbols.dict.yaml" # 码表文件，相对 schemas 目录
auto_commit = "prefix_free"      # 自动上屏策略：prefix_free / fixed_length / manual
fixed_length = 0                 # auto_commit=fixed_length 时生效：达到此码长且唯一候选时自动上屏
force_vertical = false           # 强制竖排显示候选
accent_color = ""                # 模式边框强调色（留空使用默认）
show_all_on_entry = false        # 进入模式时是否立即列出全部候选（大表慎用）
```

`auto_commit` 取值说明：

| 值 | 说明 |
|---|---|
| `prefix_free` | 候选唯一且无更长前缀匹配时自动上屏（推荐） |
| `fixed_length` | 达到 `fixed_length` 指定的码长且候选唯一时自动上屏 |
| `manual` | 始终手动按数字或空格选择 |

## 界面设置 {#界面设置}

### 候选窗口

```toml
[ui.candidate]
font_size = 18                   # 候选词字体大小（pt）
font_size_follow_theme = true    # true=字号跟随主题；false=用 font_size 自定义
per_page = 7                     # 每页候选词数量（基础档，1-9）
per_page_extended = 0            # 每页候选词数量（扩展档）；>0 时在临时拼音/快捷输入等场景生效，0=禁用
max_chars = 16                   # 候选文本最大显示字符数（8-64，超出截断加 …）
layout = "horizontal"            # 候选布局：horizontal（横排）, vertical（竖排）
inline_preedit = true            # 嵌入式编码行（显示在光标处）
preedit_mode = "top"             # 编码显示模式：top（独立行上方）, embedded（嵌入候选行前）；仅 inline_preedit=false 时生效
flip_when_above = true           # 候选窗在光标上方时反转布局（preedit 移到底部，首候选紧贴光标）
hide_window = false              # 隐藏候选窗口
index_labels = ""                # 候选序号标签覆盖（如 "①②③④⑤⑥⑦⑧⑨⑩"，留空跟随主题）
mode_accent_border = false       # 特殊模式（临时拼音/快捷输入等）内发光边框
pager_bar_display = ""           # 翻页栏显示方式：空=跟随主题, always=总是显示, auto=多页时显示, hide=完全隐藏
page_number_display = ""         # 页码显示方式：空=跟随主题, show=显示, hide=隐藏
```

### 主题

```toml
[ui.theme]
name = "default"                 # 主题名称：default, msime 或自定义主题名
style = "system"                 # 主题风格：system（跟随系统）, light, dark
```

### 文字渲染

```toml
[ui.font]
family = ""                      # 自定义字体名称（留空使用系统默认）
path = ""                        # 自定义字体文件路径
render_mode = "directwrite"      # 渲染引擎：directwrite, gdi, freetype
gdi_weight = 500                 # 候选框 GDI 字重（100-900，500=中等）
gdi_scale = 1.0                  # GDI 字体缩放（0.5-2.0）
menu_weight = 500                # 菜单 GDI 字重（100-900，500=中等）
menu_size = 12.0                 # 菜单字体大小（DPI 缩放前基础值）
```

### 编码提示

```toml
[ui.tooltip]
delay = 200                      # 候选悬停提示延迟（毫秒）
```

### 状态指示器 {#状态指示器}

```toml
[ui.status_indicator]
enabled = true                   # 启用状态指示器
duration = 800                   # 显示时长（毫秒）
display_mode = "temp"            # 显示模式：temp（临时）, always（常驻）
schema_name_style = "full"       # 方案名显示风格：full（完整名称）
show_mode = true                 # 显示中英文状态
show_punct = true                # 显示标点模式
show_full_width = false          # 显示全半角状态
position_mode = "follow_caret"   # 定位模式：follow_caret（跟随光标）, custom（固定位置）
offset_x = 0                     # X 偏移量（follow_caret 模式）
offset_y = 0                     # Y 偏移量（follow_caret 模式）
custom_x = 0                     # 固定 X 坐标（custom 模式）
custom_y = 0                     # 固定 Y 坐标（custom 模式）
font_size = 18.0                 # 字体大小
opacity = 0.9                    # 背景透明度（0.0-1.0）
background_color = ""            # 自定义背景色（留空使用主题默认）
text_color = ""                  # 自定义文字色（留空使用主题默认）
border_radius = 6.0              # 圆角半径（像素）
```

### 工具栏

```toml
[ui.toolbar]
visible = true                   # 显示工具栏
hide_in_fullscreen = true        # 前台应用全屏时自动隐藏工具栏
```

## 兼容性与诊断

```toml
[compat]
# 宿主渲染进程白名单（修改后需重启）
host_render_processes = ["SearchHost.exe"]

[debug]
log_level = "info"               # 日志级别：debug, info, warn, error（修改后需重启）
```
