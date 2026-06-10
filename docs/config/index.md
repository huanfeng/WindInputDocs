# 配置机制与全局配置

::: warning 高级主题
本文面向需要手动编辑配置文件的用户。普通用户通过[设置工具](/settings/general)即可完成配置，修改即时生效。
:::

## 配置文件位置

| 文件 | 路径 |
|------|------|
| 全局配置 | `%APPDATA%\WindInput\config.yaml` |
| 方案配置 | `%APPDATA%\WindInput\schemas\*.schema.yaml` |
| 兼容性规则 | `%APPDATA%\WindInput\compat.yaml` |
| 主题文件 | `%APPDATA%\WindInput\themes\` |
| 系统短语 | 程序内置，不可修改 |

## 配置加载机制

配置采用**三层合并**机制，优先级从低到高：

1. **代码默认值** — 程序内置的默认配置
2. **系统预置配置** — 随程序分发的 `data/config.yaml`
3. **用户配置** — `%APPDATA%\WindInput\config.yaml`

高优先级的配置覆盖低优先级的同名字段。保存时采用 **diff 保存**：仅将与系统默认不同的字段写入用户配置文件，使未修改的字段能自动跟随系统默认值的更新。

::: info
如果你发现用户配置文件中只包含部分字段，这是正常现象——只保存了与默认值不同的项。
:::

## 启动设置

```yaml
startup:
  remember_last_state: false     # 记忆上次的输入状态
  default_chinese_mode: true     # 启动默认中文模式
  default_full_width: false      # 启动默认半角
  default_chinese_punct: true    # 启动默认中文标点
```

## 输入方案

```yaml
schema:
  active: "wubi86"               # 当前使用的方案
  available:                     # 可切换的方案列表（顺序决定切换顺序）
    - "wubi86"
    - "wubi86_pinyin"
    # - "pinyin"                 # 如需启用，取消注释并重启
    # - "shuangpin"
```

方案详情请参阅[输入方案](/schema/)。

## 快捷键配置 {#快捷键配置}

```yaml
hotkeys:
  toggle_mode_keys:              # 中英文切换键（可多选）
    - "lshift"                   # 可选：lshift, rshift, lctrl, rctrl, capslock
    - "rshift"
  commit_on_switch: true         # 切换中英文时将已有编码上屏
  switch_engine: "ctrl+shift+e"  # 切换输入方案
  toggle_full_width: "shift+space"  # 全角/半角切换
  toggle_punct: "ctrl+."        # 中英文标点切换
  delete_candidate: "ctrl+shift+number"  # 删除候选词
  pin_candidate: "ctrl+number"   # 置顶候选词
  toggle_toolbar: "ctrl+shift+\\" # 显示/隐藏工具栏
  open_settings: "ctrl+shift+]"  # 打开设置工具
  add_word: "ctrl+equal"         # 快捷加词
  global_hotkeys: []             # 注册为全局热键的快捷键名称列表
```

### 全局热键

`global_hotkeys` 可以将指定快捷键注册为系统级全局热键，即使在其他应用聚焦时也能响应。例如：

```yaml
hotkeys:
  global_hotkeys:
    - "switch_engine"            # 全局响应切换方案
    - "open_settings"            # 全局响应打开设置
```

## 输入行为 {#输入行为}

```yaml
input:
  punct_follow_mode: false       # 标点是否随中英文模式切换
  filter_mode: "smart"           # 候选过滤：smart（智能）, general（通用规范）, gb18030
  enter_behavior: "commit"       # Enter 键行为：commit（上屏编码）, clear（清空）
  space_on_empty_behavior: "commit"  # 空编码按空格：commit（上屏）, clear（清空）
  pinyin_separator: "auto"       # 拼音分隔符：auto, quote, backtick, none
  smart_punct_after_digit: true  # 数字后智能标点（保持英文标点）
  smart_punct_list: ".,:"       # 数字后保持英文的标点列表
  numpad_behavior: "direct"      # 数字小键盘功能：direct（直接输入数字）, follow_main（同主键盘）
```

### 选择键与翻页键

```yaml
input:
  select_key_groups:             # 二三候选快捷上屏键（可多选）
    - "semicolon_quote"          # 分号/引号
    # - "comma_period"           # 逗号/句号
    # - "lrshift"                # 左右 Shift
    # - "lrctrl"                 # 左右 Ctrl
  select_char_keys: []             # 以词定字按键（可多选），默认关闭
    # - "comma_period"           # 逗号/句号（从词中提取单字）
    # - "minus_equal"            # 减号/等号
    # - "brackets"               # 方括号
  page_keys:                     # 翻页键（可多选）
    - "pageupdown"               # Page Up/Down
    - "minus_equal"              # 减号/等号
    # - "brackets"               # 方括号
    # - "shift_tab"              # Shift+Tab / Tab
  highlight_keys:                # 候选高亮切换键
    - "arrows"                   # 方向键
    - "tab"                      # Tab
```

### 候选按键溢出行为

当数字键或选择键超出候选范围时，可配置处理策略：

```yaml
input:
  overflow_behavior:
    number_key: "ignore"         # 数字键无效时：ignore（忽略）, commit（顶字上屏）, commit_and_input（顶字上屏并输入数字）
    select_key: "ignore"         # 二三候选键无效时：ignore, commit, commit_and_input
    select_char_key: "ignore"    # 以词定字键无效时：ignore, commit, commit_and_input
```

### 临时英文模式

```yaml
input:
  shift_temp_english:
    enabled: true                # 启用 Shift + 字母临时英文
    show_english_candidates: true  # 显示英文候选
    shift_behavior: "temp_english" # temp_english（进入临时英文）或 direct_commit（直接上屏大写字母）
    trigger_keys: []             # 符号键触发临时英文（可选）
```

### CapsLock 行为

```yaml
input:
  capslock_behavior:
    cancel_on_mode_switch: false # 切换模式时取消 CapsLock 状态
```

### 临时拼音模式

五笔等非拼音方案下，可通过特定按键触发临时拼音输入：

```yaml
input:
  temp_pinyin:
    trigger_keys:
      - "backtick"              # 可选：backtick, semicolon, z
```

### 自动配对

```yaml
input:
  auto_pair:
    chinese: true                # 中文标点自动配对
    english: true                # 英文标点自动配对
    blacklist: []                # 应用黑名单（在这些应用中禁用自动配对）
    chinese_pairs:               # 中文配对标点
      - "（）"
      - "【】"
      - "｛｝"
      - "《》"
      - "〈〉"
    english_pairs:               # 英文配对标点
      - "()"
      - "[]"
      - "{}"
      - "<>"
```

### 自定义标点映射

```yaml
input:
  punct_custom:
    enabled: false               # 启用自定义标点映射（默认关闭）
    mappings:                    # key=源字符（引号用 "1/"2/'1/'2 表示），value=[中文半角, 英文全角, 中文全角]
      "\"1": ["\u201c", "\"", "\u201c"]  # 左双引号
      "\"2": ["\u201d", "\"", "\u201d"]  # 右双引号
```

### 快捷输入

```yaml
input:
  quick_input:
    trigger_keys:                # 触发键列表（空列表=关闭）
      - "semicolon"              # 分号键触发快捷输入
    force_vertical: true         # 强制竖排显示候选
    decimal_places: 6            # 计算结果小数保留位数（0 表示取整）
```

### 引导键特殊模式 {#引导键特殊模式}

引导键特殊模式允许通过特定按键进入独立码表输入，适合快符、生僻字等小型专用码表。支持配置多组，每组相互独立。

```yaml
input:
  special_modes:
    - id: "quick_symbols"        # 模式唯一 ID
      name: "快符"               # 模式徽标显示名
      trigger_keys:              # 引导键（空码时触发，支持多键）
        - "backslash"
      table: "quick_symbols.dict.yaml"  # 码表文件，相对 schemas 目录
      auto_commit: "prefix_free" # 自动上屏策略：prefix_free / fixed_length / manual
      fixed_length: 0            # auto_commit=fixed_length 时生效：达到此码长且唯一候选时自动上屏
      force_vertical: false      # 强制竖排显示候选
      accent_color: ""           # 模式边框强调色（留空使用默认）
      show_all_on_entry: false   # 进入模式时是否立即列出全部候选（大表慎用）
```

`auto_commit` 取值说明：

| 值 | 说明 |
|---|---|
| `prefix_free` | 候选唯一且无更长前缀匹配时自动上屏（推荐） |
| `fixed_length` | 达到 `fixed_length` 指定的码长且候选唯一时自动上屏 |
| `manual` | 始终手动按数字或空格选择 |

## 界面设置 {#界面设置}

### 候选窗口

```yaml
ui:
  font_size: 18                  # 候选词字体大小（pt）
  candidates_per_page: 7         # 每页候选词数量（基础档，1-9）
  candidates_per_page_extended: 0 # 每页候选词数量（扩展档）；>0 时在临时拼音/快捷输入等场景生效，<=0 禁用（始终用基础档）
  font_family: ""                # 自定义字体名称（留空使用系统默认）
  font_path: ""                  # 自定义字体文件路径
  inline_preedit: true           # 嵌入式编码行（显示在光标处）
  preedit_mode: "top"            # 编码显示模式：top（独立行上方）, embedded（嵌入候选行前）；仅 inline_preedit=false 时生效
  hide_candidate_window: false   # 隐藏候选窗口
  candidate_layout: "horizontal" # 候选布局：horizontal（横排）, vertical（竖排）
  flip_layout_when_above: true   # 候选窗在光标上方时反转布局（preedit 移到底部，首候选紧贴光标）
  pager_bar_display: ""          # 翻页栏显示方式：空=跟随主题, always=总是显示, auto=多页时显示, hide=完全隐藏
  page_number_display: ""        # 页码显示方式：空=跟随主题, show=显示, hide=隐藏
  tooltip_delay: 200             # 编码提示延迟（毫秒）
```

### 主题

```yaml
ui:
  theme: "default"               # 主题名称：default, msime 或自定义主题名
  theme_style: "system"          # 主题风格：system（跟随系统）, light, dark
```

### 文字渲染

```yaml
ui:
  text_render_mode: "directwrite" # 渲染引擎：directwrite, gdi, freetype
  gdi_font_weight: 500            # 候选框 GDI 字重（100-900，500=中等）
  gdi_font_scale: 1.0             # GDI 字体缩放（0.5-2.0）
  menu_font_weight: 500           # 菜单 GDI 字重（100-900，500=中等）
  menu_font_size: 12.0            # 菜单字体大小（DPI 缩放前基础值）
```

### 状态指示器 {#状态指示器}

```yaml
ui:
  status_indicator:
    enabled: true                # 启用状态指示器
    duration: 800                # 显示时长（毫秒）
    display_mode: "temp"         # 显示模式：temp（临时）, always（常驻）
    schema_name_style: "full"    # 方案名显示风格：full（完整名称）
    show_mode: true              # 显示中英文状态
    show_punct: true             # 显示标点模式
    show_full_width: false       # 显示全半角状态
    position_mode: "follow_caret" # 定位模式：follow_caret（跟随光标）, custom（固定位置）
    offset_x: 0                  # X 偏移量（follow_caret 模式）
    offset_y: 0                  # Y 偏移量（follow_caret 模式）
    custom_x: 0                  # 固定 X 坐标（custom 模式）
    custom_y: 0                  # 固定 Y 坐标（custom 模式）
    font_size: 18                # 字体大小
    opacity: 0.9                 # 背景透明度（0.0-1.0）
    background_color: ""         # 自定义背景色（留空使用主题默认）
    text_color: ""               # 自定义文字色（留空使用主题默认）
    border_radius: 6             # 圆角半径（像素）
```

## 工具栏

```yaml
toolbar:
  visible: true                  # 显示工具栏
```

## 高级设置

```yaml
advanced:
  log_level: "info"              # 日志级别：debug, info, warn, error
  host_render_processes:         # 宿主渲染进程白名单
    - "SearchHost.exe"
```
