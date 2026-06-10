# 引导键特殊模式

引导键特殊模式允许你在码表方案下，按下一个"引导键"临时进入另一套独立的小型码表进行输入，完成后自动退出回到原方案。常见用途：快速符号（快符）、生僻字、专业术语缩写等。

## 工作原理

1. 正常输入时，按下配置的**引导键**（如 `\`），立即进入对应特殊模式
2. 候选窗口显示**模式徽标**（如"快符"），此时输入的字符在该模式的码表中检索
3. 上屏一个候选后自动退出，回到原方案继续输入；也可按 `Esc` 手动退出

::: tip 与快捷输入的区别
快捷输入（`;` 触发）内置了数字转换、计算器、日期等功能，使用内置逻辑处理。\
特殊模式是完全自定义的码表，适合放置任意词条，更灵活。
:::

## 配置方式

特殊模式通过全局配置文件 `config.toml` 的 `features.special_modes` 数组配置，支持定义多组：

```toml
[[features.special_modes]]
id = "quick_symbols"             # 模式唯一 ID（必填）
name = "快符"                    # 候选窗口显示的模式名（必填）
trigger_keys = ["backslash"]     # 引导键列表（必填，至少一个）；backslash=反斜杠键
table = "special/quick_symbols.dict.yaml"  # 码表文件路径，相对 schemas 目录（必填）
auto_commit = "prefix_free"      # 自动上屏策略（必填）
force_vertical = false           # 强制竖排显示候选（可选）
accent_color = ""                # 模式边框强调色，如 "#3C78AFD2"（可选）
show_all_on_entry = false        # 进入模式后立即列出全部候选（可选，大表慎用）
```

### 引导键可选值

与快捷输入、临时拼音等功能共享同一套触发键枚举：

| 键名 | 按键 |
|------|------|
| `backslash` | `\` |
| `backtick` | `` ` `` |
| `semicolon` | `;` |
| `quote` | `'` |
| `comma` | `,` |
| `period` | `.` |
| `slash` | `/` |
| `lbracket` | `[` |
| `rbracket` | `]` |

::: warning 按键冲突
引导键在空编码状态下触发。若该键已被次选键、临时拼音等功能占用，设置工具会提示冲突。同一个键只能分配给一项功能。
:::

### 自动上屏策略（`auto_commit`）

| 值 | 说明 | 适用场景 |
|---|---|---|
| `prefix_free` | 候选唯一且无更长前缀时自动上屏 | 符号、常用词 |
| `fixed_length` | 达到 `fixed_length` 指定码长且候选唯一时自动上屏 | 固定码长的码表 |
| `manual` | 始终需要手动按数字或空格选择 | 需要精确控制时 |

使用 `fixed_length` 策略时须同时设置 `fixed_length` 字段：

```toml
auto_commit = "fixed_length"
fixed_length = 2             # 输满 2 个字符且候选唯一时自动上屏
```

## 码表文件格式

码表文件为 Rime codetable 格式（`.dict.yaml`），放在方案目录 `%APPDATA%\WindInput\schemas\` 下：

```yaml
# quick_symbols.dict.yaml
---
name: quick_symbols
version: "1.0"
...

# 编码<Tab>文字[<Tab>权重]
bj	北京
sh	上海
zz	⚡
pf	🔥
```

::: tip 路径说明
`table` 字段填写相对于 `schemas\` 目录的路径。文件放在 `schemas\quick_symbols.dict.yaml` 时，填 `"quick_symbols.dict.yaml"`。也可放在子目录，如 `"my_tables/symbols.dict.yaml"`。
:::

## 多模式示例

同一配置文件中定义多个互不干扰的特殊模式：

```toml
[[features.special_modes]]
id = "symbols"
name = "符"
trigger_keys = ["backslash"]
table = "special/quick_symbols.dict.yaml"
auto_commit = "prefix_free"
accent_color = "#4CAF50CC"       # 绿色边框
force_vertical = true

[[features.special_modes]]
id = "rare_chars"
name = "生僻"
trigger_keys = ["slash"]
table = "special/rare_chars.dict.yaml"
auto_commit = "manual"
show_all_on_entry = false
```

## 注意事项

- 修改 `features.special_modes` 配置后，保存设置工具或直接编辑 `config.toml` 均可，需要重载配置进行加载
- `show_all_on_entry: true` 适合小型码表（几十条），大型码表会导致候选加载慢，不建议开启
