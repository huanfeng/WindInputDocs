# 兼容性与自定义主题

## 兼容性配置 {#兼容性配置}

兼容性规则用于修复特定应用中候选框定位、光标获取等问题。用户可在 `%APPDATA%\WindInput\compat.yaml` 中添加自定义规则。

```yaml
apps:
  - process: "Weixin.exe"        # 进程名（不区分大小写）
    comment: "微信 - 使用 rect.top 定位候选框"
    caret_use_top: true          # 使用 caret rect 的 top 而非 bottom 定位候选框
```

`caret_use_top` 适用于 `GetTextExt` 返回的 height 不稳定的 WebView 应用（如微信的 Qt WebView 输入框）。

清风输入法内置了微信的兼容性规则，会自动修正候选框定位。如果其他应用也有类似问题，可在 `compat.yaml` 中添加规则。

## 自定义主题 {#自定义主题}

将主题 YAML 文件放入 `%APPDATA%\WindInput\themes\<主题名>\theme.yaml`，即可在设置工具的"外观"页面中选择。

### 主题文件结构

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

主题支持新格式（light/dark 双变体）和旧格式（顶层颜色），新格式优先。

### 样式字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `index_style` | string | 序号样式：`circle`（圆圈）或 `text`（纯文字） |
| `accent_bar_color` | string | 左侧装饰条颜色，留空不显示 |
| `index_font_weight` | number | 序号字重（100-900） |
| `corner_radius` | number | 窗口圆角半径（像素） |
| `row_height` | number | 候选行高（像素） |
| `window_padding_x` | number | 窗口水平内边距 |
| `window_padding_y` | number | 窗口垂直内边距 |
| `item_padding_left` | number | 候选项左内边距 |
| `item_padding_right` | number | 候选项右内边距 |
| `always_show_pager` | bool | 始终显示翻页按钮（即使只有一页） |
| `show_page_number` | bool | 显示页码（如 "1/3"） |
| `vertical_min_width` | number | 竖排最小宽度（0=自动） |
| `vertical_max_width` | number | 竖排最大宽度（0=不限制） |
| `horizontal_min_width` | number | 横排最小宽度（0=自动） |
| `horizontal_max_width` | number | 横排最大宽度（0=不限制） |

### 主题颜色字段完整列表

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

### 内置主题参考

清风输入法内置两个主题，可作为自定义主题的参考：

- **default** — 圆圈序号，无装饰条，简洁风格
- **msime** — 文字序号，蓝色装饰条 `#0078D4`，始终显示翻页按钮，微软风格

建议导出内置主题文件作为模板，在其基础上修改颜色和样式。
