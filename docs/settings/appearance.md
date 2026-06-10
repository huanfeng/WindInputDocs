# 外观

## 主题

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 主题选择 | `ui.theme.name` | 选择候选窗口和工具栏的主题样式 |
| 主题风格 | `ui.theme.style` | 亮色、暗色或跟随系统 |

### 内置主题

- **default** — 默认主题，圆圈序号，简洁清新
- **msime** — 微软风格主题，文字序号，左侧蓝色装饰条

### 主题风格

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 跟随系统 | `system` | 自动跟随 Windows 亮暗模式 |
| 亮色 | `light` | 始终使用亮色主题 |
| 暗色 | `dark` | 始终使用暗色主题 |

### 自定义主题

将主题 YAML 文件放入 `%APPDATA%\WindInput\themes\<主题名>\theme.yaml`，即可在设置工具中选择。详见[自定义主题](/config/compat-theme#自定义主题)。

设置工具中提供主题预览功能，可实时查看候选窗口和工具栏在不同主题、风格下的效果。

## 候选窗口

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 字体大小 | `ui.candidate.font_size` | 候选词字体大小（12-36 pt） |
| 候选字体 | `ui.font.family` | 自定义字体，留空跟随系统默认 |
| 每页候选数（基础档） | `ui.candidate.per_page` | 普通码表输入时每页显示的候选词数量（3-10） |
| 每页候选数（扩展档） | `ui.candidate.per_page_extended` | 临时拼音/快捷输入等场景下的候选数；0 表示禁用扩展档，始终使用基础档 |
| 候选布局 | `ui.candidate.layout` | 横向或纵向排列 |
| 隐藏候选窗口 | `ui.candidate.hide_window` | 完全隐藏候选窗口 |
| 嵌入式编码行 | `ui.candidate.inline_preedit` | 输入码直接显示在光标处 |
| 编码显示方式 | `ui.candidate.preedit_mode` | 独立编码行或嵌入候选行（仅在未开启嵌入编码时生效） |
| 上方显示时反转布局 | `ui.candidate.flip_when_above` | 候选窗在光标上方时将编码行移到底部，使首候选紧贴光标（默认开启） |

### 候选布局

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 横向 | `horizontal` | 候选词横排显示 |
| 纵向 | `vertical` | 候选词竖排显示 |

### 编码显示方式

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 独立编码行 | `top` | 编码行显示在候选窗口上方 |
| 嵌入候选行 | `embedded` | 编码行嵌入候选行前方 |

## 状态提示

状态提示是输入光标处显示的小窗口，实时显示当前中英文、标点等状态。

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 启用 | `ui.status_indicator.enabled` | 开启/关闭状态提示 |
| 显示模式 | `ui.status_indicator.display_mode` | 临时显示或常驻显示 |
| 显示时长 | `ui.status_indicator.duration` | 临时模式下显示时长（200-30000 毫秒） |
| 方案名显示 | `ui.status_indicator.schema_name_style` | 全称（五笔、全拼）或简写（五、拼） |

### 显示内容

可分别选择是否显示以下信息：

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 模式 | `ui.status_indicator.show_mode` | 显示当前中英文状态 |
| 标点 | `ui.status_indicator.show_punct` | 显示当前标点模式 |
| 全半角 | `ui.status_indicator.show_full_width` | 显示当前全半角状态 |

### 位置设置

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 位置模式 | `ui.status_indicator.position_mode` | 跟随光标或自定义固定位置 |
| 水平偏移 | `ui.status_indicator.offset_x` | 跟随光标模式下的水平偏移（-50 至 50 px） |
| 垂直偏移 | `ui.status_indicator.offset_y` | 跟随光标模式下的垂直偏移（-100 至 100 px） |

### 外观设置

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 字体大小 | `ui.status_indicator.font_size` | 状态提示字体大小（10-24 pt） |
| 透明度 | `ui.status_indicator.opacity` | 背景透明度（30%-100%） |
| 圆角 | `ui.status_indicator.border_radius` | 圆角大小（0-16 px） |

## 模式彩色边框

临时拼音和快捷输入等特殊模式激活时，候选窗口外边框及输入区背景可叠加对应颜色，便于视觉区分当前模式。

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 模式彩色边框 | `ui.candidate.mode_accent_border` | 开关，默认关闭 |
| 临时拼音边框颜色 | `input.temp_pinyin.accent_color` | 十六进制颜色值（如 `#3C78AFD2`），留空使用内置默认色（蓝色） |
| 快捷输入边框颜色 | `features.quick_input.accent_color` | 十六进制颜色值，留空使用内置默认色（绿色） |

::: tip 提示
颜色值支持 8 位十六进制（`#RRGGBBAA`），可通过 alpha 通道控制透明度。亮色和暗色主题下均可生效。
:::

## 翻页栏

翻页栏包含翻页箭头和页码，可独立于主题配置进行覆盖。

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 翻页栏显示方式 | `ui.candidate.pager_bar_display` | 控制翻页箭头与页码区域的显示策略 |
| 页码显示方式 | `ui.candidate.page_number_display` | 单独控制页码文字的显示 |

### 翻页栏显示方式

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 跟随主题 | `""` （空） | 由主题配置决定（默认） |
| 总是显示 | `always` | 始终显示翻页栏，包括只有一页时 |
| 多页时显示 | `auto` | 仅当候选超过一页时显示 |
| 完全隐藏 | `hide` | 隐藏翻页箭头和页码，节省空间 |

::: tip 提示
此设置优先级高于主题配置。留空（跟随主题）时，翻页栏行为由当前主题的 `behavior.hide_pager` 和 `behavior.always_show_pager` 字段决定。
:::

## 工具栏

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 显示工具栏 | `ui.toolbar.visible` | 在屏幕上显示可拖动的输入法状态栏 |

工具栏可通过快捷键 `Ctrl + Shift + \` 切换显示/隐藏。
