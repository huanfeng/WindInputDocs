# 外观与主题

## 主题选择

内置两种主题：

- **default** — 默认主题，圆圈序号，简洁清新
- **msime** — 微软风格主题，文字序号，左侧蓝色装饰条

配置项：`ui.theme`

## 主题风格

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 跟随系统 | `system` | 自动跟随 Windows 亮暗模式 |
| 亮色 | `light` | 始终使用亮色主题 |
| 暗色 | `dark` | 始终使用暗色主题 |

配置项：`ui.theme_style`

## 主题预览

在设置工具的"外观"页面中可以实时预览不同主题和风格的效果。

## 自定义主题

将主题 YAML 文件放入 `%APPDATA%\WindInput\themes\<主题名>\theme.yaml`，即可在设置工具中选择。详见[自定义主题](/config/compat-theme#自定义主题)。

## 候选窗口设置

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 字体大小 | `ui.font_size` | 候选词字体大小（pt） |
| 每页候选数 | `ui.candidates_per_page` | 每页显示的候选词数量（1-9） |
| 字体名称 | `ui.font_family` | 自定义字体名称（留空使用系统默认） |
| 字体文件 | `ui.font_path` | 自定义字体文件路径 |
| 布局方向 | `ui.candidate_layout` | `horizontal`（横排）或 `vertical`（竖排） |
| 隐藏候选窗口 | `ui.hide_candidate_window` | 完全隐藏候选窗口 |

## 编码行显示

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 嵌入式编码行 | `ui.inline_preedit` | 将编码行显示在光标处（嵌入式） |
| 编码显示模式 | `ui.preedit_mode` | `top`（独立行上方）或 `embedded`（嵌入候选行前）；仅 inline_preedit=false 时生效 |
| 编码提示延迟 | `ui.tooltip_delay` | 编码提示弹出延迟（毫秒） |

## 文字渲染引擎

| 选项 | 配置值 | 说明 |
|------|--------|------|
| DirectWrite | `directwrite` | 默认，支持高清渲染 |
| GDI | `gdi` | 兼容性更好，适合部分字体渲染异常的情况 |
| FreeType | `freetype` | 开源渲染引擎 |

配置项：`ui.text_render_mode`

### GDI 渲染附加设置

| 选项 | 配置项 | 说明 |
|------|--------|------|
| GDI 字重 | `ui.gdi_font_weight` | 候选框 GDI 字重（100-900，500=中等） |
| GDI 缩放 | `ui.gdi_font_scale` | GDI 字体缩放（0.5-2.0） |
| 菜单字重 | `ui.menu_font_weight` | 菜单 GDI 字重（100-900） |
| 菜单字体大小 | `ui.menu_font_size` | 菜单字体大小（DPI 缩放前基础值） |

## 状态指示器

状态指示器是输入光标处显示的小窗口，实时显示当前中英文、标点等状态。

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 启用 | `ui.status_indicator.enabled` | 开启/关闭状态指示器 |
| 显示时长 | `ui.status_indicator.duration` | 临时模式下显示时长（毫秒） |
| 显示模式 | `ui.status_indicator.display_mode` | `temp`（切换时临时显示）或 `always`（常驻显示） |
| 方案名风格 | `ui.status_indicator.schema_name_style` | `full`（完整方案名称） |
| 显示中英文 | `ui.status_indicator.show_mode` | 显示当前中英文状态 |
| 显示标点模式 | `ui.status_indicator.show_punct` | 显示当前标点模式 |
| 显示全半角 | `ui.status_indicator.show_full_width` | 显示当前全半角状态 |
| 定位模式 | `ui.status_indicator.position_mode` | `follow_caret`（跟随光标）或 `custom`（固定位置） |
| 字体大小 | `ui.status_indicator.font_size` | 状态指示器字体大小 |
| 透明度 | `ui.status_indicator.opacity` | 背景透明度（0.0-1.0） |
