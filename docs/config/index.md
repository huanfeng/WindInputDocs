# 配置说明

清风输入法的配置分为两层：**全局配置**（`config.yaml`）控制通用行为，**方案配置**（`*.schema.yaml`）控制各输入方案的引擎行为。

## 配置文件位置

| 文件 | 路径 |
|------|------|
| 全局配置 | `%APPDATA%\WindInput\config.yaml` |
| 方案配置 | `%APPDATA%\WindInput\data\schemas\*.schema.yaml` |
| 兼容性规则 | `%APPDATA%\WindInput\compat.yaml` |
| 主题文件 | `%APPDATA%\WindInput\themes\` |
| 系统短语 | 程序内置，不可修改 |

::: tip
推荐通过设置工具修改配置（按 `Ctrl + Shift + ]` 打开），所有修改即时生效，无需重启输入法。
:::

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
    - "pinyin"
    - "shuangpin"
```

方案详情请参阅[输入方案](/guide/schemas)。

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
  select_char_keys:              # 以词定字按键（可多选）
    - "comma_period"             # 逗号/句号（从词中提取单字）
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
    enabled: true                # 启用自定义标点映射
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

## 界面设置 {#界面设置}

### 候选窗口

```yaml
ui:
  font_size: 18                  # 候选词字体大小（pt）
  candidates_per_page: 7         # 每页候选词数量（1-9）
  font_family: ""                # 自定义字体名称（留空使用系统默认）
  font_path: ""                  # 自定义字体文件路径
  inline_preedit: true           # 嵌入式编码行（显示在光标处）
  preedit_mode: "top"            # 编码显示模式：top（独立行上方）, embedded（嵌入候选行前）；仅 inline_preedit=false 时生效
  hide_candidate_window: false   # 隐藏候选窗口
  candidate_layout: "horizontal" # 候选布局：horizontal（横排）, vertical（竖排）
  tooltip_delay: 200             # 编码提示延迟（毫秒）
```

### 主题

```yaml
ui:
  theme: "default"               # 主题名称：default, msime 或自定义主题名
  theme_style: "system"          # 主题风格：system（跟随系统）, light, dark
```

内置两种主题：
- **default** — 默认主题，圆圈序号，简洁清新
- **msime** — 微软风格主题，文字序号，左侧蓝色装饰条

设置 `theme_style: "system"` 可跟随系统亮暗模式自动切换。

### 自定义主题

将主题 YAML 文件放入 `%APPDATA%\WindInput\themes\<主题名>\theme.yaml`，即可在设置工具中选择。

主题文件结构：

```yaml
meta:
  name: "主题名称"
  version: "2.0"
  author: "作者"
  order: 0                       # 排序序号（第三方主题自动 +100）

style:
  index_style: "circle"          # 序号样式：circle（圆圈，默认）, text（纯文字）
  accent_bar_color: "#0078D4"    # 左侧装饰条颜色（留空则不显示）
  index_font_weight: 400         # 序号字重（100-900）
  corner_radius: 8               # 窗口圆角（像素）
  row_height: 32                 # 候选行高（像素）
  window_padding_x: 8            # 窗口水平内边距
  window_padding_y: 6            # 窗口垂直内边距
  item_padding_left: 8           # 候选项左内边距
  item_padding_right: 8          # 候选项右内边距
  always_show_pager: false       # 始终显示翻页按钮
  show_page_number: true         # 显示页码（如 "1/3"）
  # 以下为布局尺寸，0 表示自动
  vertical_min_width: 0          # 竖排最小宽度
  vertical_max_width: 600        # 竖排最大宽度
  horizontal_min_width: 200      # 横排最小宽度
  horizontal_max_width: 0        # 横排最大宽度（0=不限制）

light:                           # 亮色模式颜色
  candidate_window:
    background_color: "#FFFFFF"
    border_color: "#C8C8C8"
    text_color: "#1E1E1E"
    # ... 更多颜色字段见下方
  toolbar: { ... }
  popup_menu: { ... }
  tooltip: { ... }
  mode_indicator: { ... }

dark:                            # 暗色模式颜色
  candidate_window: { ... }
  # ... 与 light 相同结构
```

::: details 主题颜色字段完整列表

**candidate_window**（候选窗口）：
`background_color`, `border_color`, `text_color`, `index_color`, `index_bg_color`, `hover_bg_color`, `selected_bg_color`, `input_bg_color`, `input_text_color`, `comment_color`, `shadow_color`

**toolbar**（工具栏）：
`background_color`, `border_color`, `grip_color`, `mode_chinese_bg_color`, `mode_english_bg_color`, `mode_text_color`, `full_width_on_bg_color`, `full_width_off_bg_color`, `full_width_on_color`, `full_width_off_color`, `punct_chinese_bg_color`, `punct_english_bg_color`, `punct_chinese_color`, `punct_english_color`, `settings_bg_color`, `settings_icon_color`, `settings_hole_color`

**popup_menu**（弹出菜单）：
`background_color`, `border_color`, `text_color`, `disabled_color`, `hover_bg_color`, `hover_text_color`, `separator_color`

**tooltip**（提示框）：
`background_color`, `text_color`

**mode_indicator**（状态指示器）：
`background_color`, `text_color`

:::

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

光标处显示当前输入状态的小窗口。

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

## 模糊音 {#模糊音}

模糊音在方案配置文件中设置。全拼和双拼方案支持以下 11 组模糊音：

| 模糊对 | 配置项 | 说明 |
|--------|--------|------|
| z ↔ zh | `zh_z` | 平翘舌 |
| c ↔ ch | `ch_c` | 平翘舌 |
| s ↔ sh | `sh_s` | 平翘舌 |
| n ↔ l | `n_l` | 鼻边音 |
| r ↔ l | `r_l` | 边音 |
| f ↔ h | `f_h` | 唇齿音 |
| an ↔ ang | `an_ang` | 前后鼻音 |
| en ↔ eng | `en_eng` | 前后鼻音 |
| in ↔ ing | `in_ing` | 前后鼻音 |
| ian ↔ iang | `ian_iang` | 前后鼻音 |
| uan ↔ uang | `uan_uang` | 前后鼻音 |

可通过设置工具的"模糊音"页面逐组启用或禁用。

## 兼容性配置 {#兼容性配置}

兼容性规则用于修复特定应用中候选框定位、光标获取等问题。用户可在 `%APPDATA%\WindInput\compat.yaml` 中添加自定义规则。

```yaml
apps:
  - process: "Weixin.exe"        # 进程名（不区分大小写）
    comment: "微信 - 使用 rect.top 定位候选框"
    caret_use_top: true          # 使用 caret rect 的 top 而非 bottom 定位候选框
```

`caret_use_top` 适用于 `GetTextExt` 返回的 height 不稳定的 WebView 应用（如微信的 Qt WebView 输入框）。

## 高级设置

```yaml
advanced:
  log_level: "info"              # 日志级别：debug, info, warn, error
  host_render_processes:         # 宿主渲染进程白名单
    - "SearchHost.exe"
```

## 方案配置详解 {#方案配置详解}

每个方案有独立的 YAML 配置文件，位于 `%APPDATA%\WindInput\data\schemas\` 目录：

| 文件 | 方案 |
|------|------|
| `pinyin.schema.yaml` | 全拼 |
| `shuangpin.schema.yaml` | 双拼 |
| `wubi86.schema.yaml` | 五笔 86 |
| `wubi86_pinyin.schema.yaml` | 五笔拼音混输 |

### 五笔引擎配置

五笔相关的引擎配置在 `wubi86.schema.yaml` 的 `engine.codetable` 中：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `max_code_length` | 最大编码长度 | `4` |
| `auto_commit_unique` | 四码唯一自动上屏 | `false` |
| `top_code_commit` | 五码顶字上屏 | `true` |
| `punct_commit` | 标点顶字上屏 | `true` |
| `clear_on_empty_max` | 四码空码自动清空 | `false` |
| `show_code_hint` | 显示编码提示 | `true` |
| `single_code_input` | 单编码输入模式 | `false` |
| `candidate_sort_mode` | 候选排序模式：`frequency` | `frequency` |
| `z_key_repeat` | Z 键重复/学习 | `true` |

### 混输引擎配置

五笔拼音混输在 `wubi86_pinyin.schema.yaml` 的 `engine.mixed` 中：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `primary_schema` | 主方案（五笔） | `wubi86` |
| `secondary_schema` | 辅助方案（拼音） | `pinyin` |
| `min_pinyin_length` | 最短拼音编码长度 | `2` |
| `codetable_weight_boost` | 码表权重倍数 | `10000000` |
| `show_source_hint` | 显示匹配来源提示 | `false` |
| `z_key_repeat` | Z 键重复/学习 | `true` |

### 拼音引擎配置

全拼和双拼在方案文件的 `engine.pinyin` 中：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `scheme` | 拼音方案：`full`（全拼）, `shuangpin`（双拼） | — |
| `show_code_hint` | 显示编码提示 | `true` |
| `use_smart_compose` | 智能组词 | `true` |
| `candidate_order` | 候选排序：`char_first`, `phrase_first`, `smart` | `smart` |

双拼额外配置：

```yaml
engine:
  pinyin:
    scheme: shuangpin
    shuangpin:
      layout: xiaohe            # 双拼布局：xiaohe, ziranma, mspy, sogou, abc, ziguang
```

### 编码器（五笔词组自动编码）

```yaml
encoder:
  max_word_length: 10           # 最大词长
  rules:
    - length_equal: 2           # 二字词取码规则
      formula: "AaAbBaBb"       # 第一字前两码 + 第二字前两码
    - length_equal: 3           # 三字词
      formula: "AaBaCaCb"       # 前三字首码 + 末字次码
    - length_in_range: [4, 10]  # 四字及以上
      formula: "AaBaCaZa"       # 前三字首码 + 末字首码
```

### 学习与调频

```yaml
learning:
  auto_learn:
    enabled: false              # 自动词组学习
  freq:
    enabled: false              # 词频调整
    protect_top_n: 1            # 保护前 N 个候选不被调频
  temp_max_entries: 5000        # 临时词库最大条目数
  temp_promote_count: 3         # 临时词提升计数
```

### 词库权重

方案中的 `dictionaries` 可以配置 `weight_spec` 控制词库权重分布：

```yaml
dictionaries:
  - id: pinyin_main
    weight_spec:
      median: 200               # 中位权重
      max: 19260817             # 最大权重
      mode: log                 # 权重模式：linear（线性）, log（对数）
```
