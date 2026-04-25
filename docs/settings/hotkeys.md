# 按键

## 中英文切换

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 切换按键 | `hotkeys.toggle_mode_keys` | 选择用于切换中英文模式的按键（可多选） |
| 切换时编码上屏 | `hotkeys.commit_on_switch` | 中文切换为英文时，将已输入的编码直接上屏 |

### 切换按键选项

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 左 Shift | `lshift` | 默认启用 |
| 右 Shift | `rshift` | 默认启用 |
| 左 Ctrl | `lctrl` | |
| 右 Ctrl | `rctrl` | |
| CapsLock | `capslock` | 按 CapsLock 切换 |

## 候选词管理

| 功能 | 配置项 | 选项 |
|------|--------|------|
| 置顶词条 | `hotkeys.pin_candidate` | Ctrl+数字 / Ctrl+Shift+数字 / 不使用 |
| 删除词条 | `hotkeys.delete_candidate` | Ctrl+Shift+数字 / Ctrl+数字 / 不使用 |

::: warning 注意
置顶和删除不能使用相同的快捷键组合。
:::

## 候选操作

### 次选/三选快捷键

选择用于快速上屏第 2、3 候选的按键（可多选）：

| 选项 | 配置值 | 按键 |
|------|--------|------|
| 分号/引号 | `semicolon_quote` | `;` 选择第 2 候选，`'` 选择第 3 候选 |
| 逗号/句号 | `comma_period` | `,` / `.` |
| 左右 Shift | `lrshift` | 左 Shift / 右 Shift |
| 左右 Ctrl | `lrctrl` | 左 Ctrl / 右 Ctrl |

配置项：`input.select_key_groups`

### 高亮移动按键

选择用于移动候选高亮项的按键（可多选）：

| 选项 | 配置值 | 按键 |
|------|--------|------|
| 方向键 | `arrows` | 上/下方向键 |
| Tab | `tab` | Tab / Shift+Tab |

配置项：`input.highlight_keys`

::: tip 提示
Tab/Shift+Tab 与翻页键互斥，启用其中一方时另一方会自动取消。
:::

### 翻页快捷键

选择用于候选翻页的按键（可多选）：

| 选项 | 配置值 | 按键 |
|------|--------|------|
| Page Up/Down | `pageupdown` | Page Up / Page Down |
| 减号/等号 | `minus_equal` | `-` 上一页 / `=` 下一页 |
| 方括号 | `brackets` | `[` 上一页 / `]` 下一页 |
| Shift+Tab/Tab | `shift_tab` | Shift+Tab 上一页 / Tab 下一页 |

配置项：`input.page_keys`

### 以词定字

输入词组后，通过特定键从词中提取单字（可多选）：

| 选项 | 配置值 | 按键 |
|------|--------|------|
| 逗号/句号 | `comma_period` | `,` 取首字，`.` 取末字 |
| 减号/等号 | `minus_equal` | `-` / `=` |
| 方括号 | `brackets` | `[` / `]` |

配置项：`input.select_char_keys`

::: tip 提示
以词定字按键与翻页键、候选选择键存在互斥关系，启用后冲突项会自动取消。
:::

## 功能快捷键

| 功能 | 配置项 | 默认值 |
|------|--------|--------|
| 切换输入方案 | `hotkeys.switch_engine` | `Ctrl + Shift + E` |
| 切换全角/半角 | `hotkeys.toggle_full_width` | `Shift + Space` |
| 切换中/英文标点 | `hotkeys.toggle_punct` | `Ctrl + .` |
| 显示/隐藏状态栏 | `hotkeys.toggle_toolbar` | `Ctrl + Shift + \` |
| 打开设置 | `hotkeys.open_settings` | `Ctrl + Shift + ]` |
| 快捷加词 | `hotkeys.add_word` | `Ctrl + =` |

所有功能快捷键均可自定义修改。部分快捷键支持注册为全局快捷键，在任何应用聚焦时都能响应。

### 全局快捷键

默认情况下，快捷键只在输入法激活时响应。在设置工具中勾选需要注册为全局快捷键的项，或通过配置文件设置：

```yaml
hotkeys:
  global_hotkeys:
    - "switch_engine"
    - "open_settings"
```

配置项：`hotkeys.global_hotkeys`
