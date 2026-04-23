# 快捷键

## 中英文切换键

选择用于切换中英文模式的按键，支持多选：

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 左 Shift | `lshift` | 默认启用 |
| 右 Shift | `rshift` | 默认启用 |
| 左 Ctrl | `lctrl` | |
| 右 Ctrl | `rctrl` | |
| CapsLock | `capslock` | 按 CapsLock 切换 |

配置项：`hotkeys.toggle_mode_keys`

## 切换行为

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 切换时上屏编码 | `hotkeys.commit_on_switch` | 切换中英文时将已有编码上屏，而非清空 |

## 功能快捷键

| 功能 | 配置项 | 默认值 |
|------|--------|--------|
| 切换输入方案 | `hotkeys.switch_engine` | `Ctrl + Shift + E` |
| 全角/半角切换 | `hotkeys.toggle_full_width` | `Shift + Space` |
| 中英文标点切换 | `hotkeys.toggle_punct` | `Ctrl + .` |
| 删除候选词 | `hotkeys.delete_candidate` | `Ctrl + Shift + 数字` |
| 置顶候选词 | `hotkeys.pin_candidate` | `Ctrl + 数字` |
| 显示/隐藏工具栏 | `hotkeys.toggle_toolbar` | `Ctrl + Shift + \` |
| 打开设置工具 | `hotkeys.open_settings` | `Ctrl + Shift + ]` |
| 快捷加词 | `hotkeys.add_word` | `Ctrl + =` |

## 全局热键

默认情况下，清风输入法的快捷键只在输入法激活时响应。通过全局热键功能，可以让指定快捷键在任何应用聚焦时都能响应。

在设置工具中勾选需要注册为全局热键的快捷键，或通过配置文件设置：

```yaml
hotkeys:
  global_hotkeys:
    - "switch_engine"            # 全局响应切换方案
    - "open_settings"            # 全局响应打开设置
```

配置项：`hotkeys.global_hotkeys`

## 完整快捷键参考

所有快捷键的完整列表请参阅[快捷键参考](/hotkeys/)。
