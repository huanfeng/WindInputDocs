# 兼容性与自定义主题

## 兼容性配置 {#兼容性配置}

兼容性规则用于修复特定应用中候选框定位、光标获取等问题。用户可在 `%APPDATA%\WindInput\compat.toml` 中添加自定义规则（旧版本为 `compat.yaml`，升级后自动迁移）。

```toml
[[apps]]
process = "Weixin.exe"        # 进程名（不区分大小写）
comment = "微信 - 使用 rect.top 定位候选框"
caret_use_top = true          # 使用 caret rect 的 top 而非 bottom 定位候选框
skip_caret_pending = false    # 是否跳过首字符等待真实光标坐标（即时候选）
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `process` | string | 进程名，不区分大小写，如 `Notepad.exe` |
| `comment` | string | 备注说明，仅用于文档与可读性 |
| `caret_use_top` | bool | 使用 caret rect 的 `top` 而非 `bottom` 定位候选框 |
| `skip_caret_pending` | bool | 跳过首次 composition 的光标等待，详见下文「即时候选」 |
| `pin_candidate_position` | bool | 启用「固定候选位置」：拖动后的位置按显示器跨会话持久化，详见下文 |

`caret_use_top` 适用于 `GetTextExt` 返回的 height 不稳定的 WebView 应用（如微信的 Qt WebView 输入框）。

清风输入法内置了微信的兼容性规则，会自动修正候选框定位。如果其他应用也有类似问题，可在 `compat.toml` 中添加规则。

### 即时候选（skip_caret_pending） {#即时候选}

默认情况下，按下首字符触发 composition 时，输入法会**短暂等待**宿主回传 reflow 后的真实光标坐标，再显示候选窗。这是为了避免候选窗先出现在 idle 光标位置、随后又跳到 composition 位置造成的视觉漂移。

但对于一部分**光标本身就稳定**的应用（不会因 composition 创建而发生 reflow 漂移），这个等待是纯粹的延迟，会让用户感到首字符的候选窗"反应慢半拍"。为这类应用启用「即时候选」即可跳过等待，让候选窗在首字符按下后立即出现。

#### 启用方式（推荐）：右键菜单一键开关

1. 切换到目标应用，确保输入法处于该应用的输入焦点中；
2. 在系统托盘的清风输入法图标上**右键**，或在候选工具栏上点击**设置图标**打开统一菜单；
3. 选择 **高级 → 为 `<进程名>` 启用即时候选**，使其勾选；
4. 设置立即生效，无需重启输入法。

菜单项标签中的 `<进程名>` 会自动显示为当前焦点应用的可执行文件名（例如 `Code.exe`、`Notepad.exe`）。再次点击可关闭。

> 该操作会在 `%APPDATA%\WindInput\compat.toml` 中为对应进程写入或更新 `skip_caret_pending` 字段；如该文件不存在会自动创建。

#### 启用方式：手动编辑 compat.toml

如需批量配置或在自动化部署中预置规则，可直接编辑 `compat.toml`：

```toml
[[apps]]
process = "Code.exe"
comment = "VS Code - 光标稳定，启用即时候选"
skip_caret_pending = true
```

修改后通过右键菜单 → **重载配置** 即可生效。

#### 何时建议启用？

- 首字符候选窗出现明显延迟、感觉"反应慢"；
- 应用是原生文本控件或常规 Edit 控件，光标位置稳定；
- 在该应用中**没有**观察到候选窗"先错位再跳动"的现象。

#### 何时不要启用？

- 应用是 WebView / Electron / Qt 等会在 composition 创建时触发 reflow 漂移的环境；
- 启用后观察到首字符的候选窗出现在错误位置（如左上角原点、上一行末尾等）；遇到此情况请关闭。

### 固定候选位置（pin_candidate_position） {#固定候选位置}

少数应用上报的光标坐标长期落在错误位置（屏幕边角、原点、上一行行尾等），让候选窗每次都贴在远离实际输入处的角落。对这类应用，可以启用「固定候选位置」：用户**一次性手动拖动**候选窗到合适的位置，之后清风会**按显示器**把这个位置记住，跨会话恢复，让该应用的候选窗稳定在那里。

#### 启用方式（推荐）：右键菜单一键开关

1. 切换到目标应用，确保输入法处于该应用的输入焦点中；
2. 在系统托盘的清风输入法图标上**右键**，或在候选工具栏上点击**设置图标**打开统一菜单；
3. 选择 **高级 → 为 `<进程名>` 启用固定候选位置**，使其勾选；
4. 在该应用中触发一次候选窗，**鼠标按住候选窗空白处拖动**到目标位置后释放；
5. 自此之后，该应用每次出现候选窗都会停在这个位置；下次拖动会覆盖记忆。

再次点击菜单项即可关闭。**关闭时会同步清空该应用已记忆的所有显示器位置**，再次启用需重新拖动。

> 该操作会在 `%APPDATA%\WindInput\compat.toml` 中为对应进程写入 `pin_candidate_position = true`，记忆的坐标则写入 `state.toml` 的 `candidate_pin_positions` 字段；两者解耦，便于备份或在多机间同步。

#### 多显示器与分辨率变化

- 位置按**进程 + 显示器**两层记忆：在显示器 A 上拖到 `(800, 600)`，再切换到显示器 B 上拖到 `(120, 80)`，两个显示器各自保留独立位置；
- 显示候选窗时，按 caret 当前所在显示器查表：
  - 同屏有记忆 → 直接使用，并 clamp 到当前显示器工作区（分辨率变化时也始终可见）；
  - 同屏无记忆但其他屏仍有有效记忆（**多屏轮换**）→ 回落到 caret 自动定位，不会把别屏坐标贴到当前屏；
  - 同屏无记忆且其他屏的记忆也都"孤儿化"（保存的显示器已拔、分辨率剧变）→ 任选一条 clamp 到 caret 所在显示器工作区，保证 pin 行为不失效；
- clamp 后的临时安全位置**不会回写**，避免污染用户原意的坐标。

#### 与会话内拖动的关系

未启用该规则的应用：拖动只在当前会话内有效，候选窗关闭或输入串清空后即恢复到 caret 自动定位（旧行为不变）。

#### 启用后、还没拖过时

候选窗仍按 caret 自动定位，行为与未启用规则一致；第一次拖动后才开始按记忆位置显示。

## 自定义主题 {#自定义主题}

将主题 YAML 文件放入以下目录，即可在设置工具的「外观」页面中选择：

- **Windows**：`%APPDATA%\WindInput\themes\<主题名>\theme.yaml`
- **macOS**：`~/Library/Application Support/WindInput/themes/<主题名>/theme.yaml`

### 主题文件结构（v3）

主题文件由四个职责独立的顶层块组成：

```yaml
meta:
  name: "主题名称"        # 必填
  version: "1.0"         # 可选
  author: "作者"          # 可选

base: default             # 可选：继承内置主题（default 或 msime），未指定的字段从基主题继承

colors:                   # 颜色 token 表（扁平，支持亮暗分设）
  primary:   "#4285F4"
  accent:    "${primary}"                              # 引用其他 token
  on_accent: "#FFFFFF"
  bg:        { light: "#FFFFFF", dark: "#2D2D2D" }    # 亮/暗分设
  text:      { light: "#1E1E1E", dark: "#E8E8E8" }
  border:    { light: "#C8C8C8", dark: "#555555" }
  selection: { light: "#E6F0FF", dark: "#3D4A5C" }
  hover:     "${selection}"
  shadow:    "#0000001A"

resources:                # 图片资源（可选）
  panel: { light: "panel.png", dark: "panel-dark.png" }

views:                    # 几何与布局（盒模型树）
  candidate:
    window:
      padding: { top: 6, left: 8, right: 8, bottom: 6 }
      border:
        width: 1
        radius: 8
        color: "${border}"
      background:
        color: "${bg}"
      shadow:
        offset_y: 4
        color: "${shadow}"
    item:
      padding: { top: 4, left: 8, right: 8, bottom: 4 }
      border:
        radius: 4
      states:
        selected:
          background: { color: "${selection}" }
          color: "${text}"
        hover:
          background: { color: "${hover}" }
    index:
      background:
        color: "${accent}"
        shape: circle           # 圆形序号；改为 none 则无形状
      color: "${on_accent}"
    accent_bar:
      enabled: false            # 左侧装饰条开关

behavior:                 # 主题推荐的默认值（用户可在设置工具中单独覆盖）
  candidate:
    font_size: 18
    always_show_pager: false
    show_page_number: true
    vertical_max_width: 600
```

### 快速上手：继承内置主题

最简单的方式是声明 `base` 并只写需要改动的部分，其余从内置主题继承：

```yaml
meta:
  name: "我的蓝色主题"

base: default             # 继承 default，只覆盖以下内容

colors:
  primary: "#0066CC"      # 只改主色
```

### 颜色系统

`colors` 块是所有颜色的唯一来源，`views` 节点通过 `${tokenName}` 引用。

**亮暗分设语法：**
```yaml
colors:
  bg: { light: "#FFFFFF", dark: "#2D2D2D" }   # 亮暗使用不同值
  text: "#1E1E1E"                              # 亮暗共用同一值
```

**颜色 token 引用：**
```yaml
colors:
  primary: "#4285F4"
  accent:  "${primary}"    # 等同于 primary 的值
  hover:   "${selection}"  # 等同于 selection 的值
```

**颜色格式：** `"#RGB"` / `"#RRGGBB"` / `"#RRGGBBAA"`（支持 alpha 透明度）/ `"transparent"`

### 自动派生颜色

只需提供 `primary`，开启派生后其余语义色由算法自动生成：

```yaml
colors:
  primary: "#4285F4"
  derive:
    enabled: true     # 从 primary 自动派生 bg/text/border 等语义色
  auto_dark: true     # 为未显式写 dark 的颜色自动生成暗色版本
```

### behavior 字段说明

`behavior` 中的值是主题给用户的推荐默认，用户可在设置工具的「外观」页单独覆盖，覆盖跨主题切换保持。

| 字段 | 类型 | 说明 |
|------|------|------|
| `candidate.font_size` | number | 候选字号基准（pt） |
| `candidate.always_show_pager` | bool | 始终显示翻页按钮（即使只有一页） |
| `candidate.show_page_number` | bool | 显示页码（如 "1/3"） |
| `candidate.vertical_max_width` | number | 竖排模式最大宽度（像素） |

### views 几何节点说明

#### 候选窗（candidate）

| 节点 | 主要字段 | 说明 |
|------|---------|------|
| `candidate.window` | `padding`, `border`, `background`, `shadow` | 候选窗整体外框 |
| `candidate.candidate_list` | `gap`, `band_gap` | 候选列表容器（项间距、分组间距） |
| `candidate.item` | `padding`, `border`, `states` | 候选项（含 `selected` / `hover` 状态 patch） |
| `candidate.index` | `background`, `color`, `font` | 序号区域（`shape: circle` 启用圆形） |
| `candidate.text` | `color`, `font` | 候选词文字 |
| `candidate.comment` | `color`, `font` | 注释/编码文字 |
| `candidate.accent_bar` | `enabled`, `width`, `offset`, `height_ratio`, `background` | 左侧装饰条 |
| `footer_bar` | `color`, `font_size` | 翻页区（页码文字 + 启用态翻页箭头）；`color` 未配时页码回退 `preedit_bar.color`、启用箭头回退 `index` 背景色 |

#### 工具栏（toolbar）

工具栏节点除颜色字段外，还支持几何尺寸覆盖（所有几何字段均为 `*Dimension`，省略时使用内置默认，零回归）：

| 节点 / 字段 | 默认值 | 说明 |
|------------|--------|------|
| `toolbar.height` | `30dp` | 整条工具栏高度 |
| `toolbar.grip_width` | `10dp` | 左侧拖动区宽度 |
| `toolbar.button_width` | `26dp` | 单个按钮槽位宽（含 padding） |
| `toolbar.button_padding` | `2dp` | 按钮四周内缩间距 |
| `toolbar.button_radius` | `4dp` | 按钮圆角 |
| `toolbar.background` | — | 工具栏背景填充 |
| `toolbar.border` | — | 工具栏边框 |
| `toolbar.grip` | — | 拖动区样式 |
| `toolbar.button` | — | 按钮颜色（base + mode 状态覆盖） |
| `toolbar.settings` | — | 设置齿轮图标颜色 |

```yaml
views:
  toolbar:
    height: 32dp          # 调高工具栏
    button_width: 28dp    # 加宽按钮槽位
    button_radius: 6dp    # 加大圆角
```

#### 弹出菜单（menu）

| 节点 | 主要字段 | 说明 |
|------|---------|------|
| `menu.root` | `padding`, `border`, `background` | 菜单容器（背景/边框/上下 padding） |
| `menu.item` | `padding`, `border`, `color`, `font`, `states` | 菜单项；`border.radius` 同时作用于 hover 高亮背景圆角；`states.hover.border.radius` 可单独覆盖 hover 圆角 |
| `menu.separator` | `color` | 分隔线颜色 |

```yaml
views:
  menu:
    item:
      border:
        radius: 4         # 菜单项 hover 高亮背景圆角
      states:
        hover:
          background: { color: "${hover}" }
          border:
            radius: 6     # hover 状态单独覆盖圆角（可选）
```

### 内置主题参考

清风输入法内置两个主题，可作为参考：

- **default** — 圆圈序号，无装饰条，简洁风格
- **msime** — 文字序号，蓝色装饰条，始终显示翻页按钮，微软风格

内置主题文件位于安装目录下的 `themes/` 文件夹，可查阅其结构作为模板起点。
