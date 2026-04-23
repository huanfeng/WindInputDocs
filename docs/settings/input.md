# 输入行为

## Enter 键行为

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 上屏编码 | `commit` | 按 Enter 将原始编码直接上屏 |
| 清空编码 | `clear` | 按 Enter 清空当前输入 |

配置项：`input.enter_behavior`

## 空码空格行为

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 上屏 | `commit` | 空编码时按空格上屏 |
| 清空 | `clear` | 空编码时按空格清空 |

配置项：`input.space_on_empty_behavior`

## 标点跟随模式

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 关闭 | `false` | 标点始终按当前标点模式输出 |
| 开启 | `true` | 标点随中英文模式自动切换 |

配置项：`input.punct_follow_mode`

## 候选过滤

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 智能 | `smart` | 智能过滤（推荐） |
| 通用规范 | `general` | 按通用规范汉字表过滤 |
| GB18030 | `gb18030` | 按 GB18030 标准过滤 |

配置项：`input.filter_mode`

## 拼音分隔符

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 自动 | `auto` | 自动插入分隔符 |
| 引号 | `quote` | 使用引号作为分隔符 |
| 反引号 | `backtick` | 使用反引号作为分隔符 |
| 无 | `none` | 不使用分隔符 |

配置项：`input.pinyin_separator`

## 智能标点

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 数字后智能标点 | `input.smart_punct_after_digit` | 数字后保持英文标点（如 `1.` 输出英文句点） |
| 英文标点列表 | `input.smart_punct_list` | 数字后保持英文的标点字符集合 |

## 数字小键盘

| 选项 | 配置值 | 说明 |
|------|--------|------|
| 直接输入 | `direct` | 小键盘始终直接输入数字 |
| 跟随主键盘 | `follow_main` | 小键盘行为与主键盘数字键一致 |

配置项：`input.numpad_behavior`

## 选择键与翻页键

### 二三候选快捷上屏

| 选项 | 配置值 | 按键 |
|------|--------|------|
| 分号/引号 | `semicolon_quote` | `;` 选择第 2 候选，`'` 选择第 3 候选 |
| 逗号/句号 | `comma_period` | `,` / `.` |
| 左右 Shift | `lrshift` | 左 Shift / 右 Shift |
| 左右 Ctrl | `lrctrl` | 左 Ctrl / 右 Ctrl |

配置项：`input.select_key_groups`（可多选）

### 以词定字

输入词组后，通过特定键从词中提取单字。例如输入"中国"后按逗号提取"中"，按句号提取"国"。

| 选项 | 配置值 | 按键 |
|------|--------|------|
| 逗号/句号 | `comma_period` | `,` 取首字，`.` 取末字 |
| 减号/等号 | `minus_equal` | `-` / `=` |
| 方括号 | `brackets` | `[` / `]` |

配置项：`input.select_char_keys`（可多选）

### 翻页键

| 选项 | 配置值 | 按键 |
|------|--------|------|
| Page Up/Down | `pageupdown` | Page Up / Page Down |
| 减号/等号 | `minus_equal` | `-` 上一页 / `=` 下一页 |
| 方括号 | `brackets` | `[` 上一页 / `]` 下一页 |
| Shift+Tab | `shift_tab` | Shift+Tab 上一页 / Tab 下一页 |

配置项：`input.page_keys`（可多选）

### 候选高亮切换

| 选项 | 配置值 | 按键 |
|------|--------|------|
| 方向键 | `arrows` | 上/下方向键 |
| Tab | `tab` | Tab 键 |

配置项：`input.highlight_keys`（可多选）

## 候选按键溢出行为

当数字键或选择键超出候选范围时，可配置处理策略：

| 按键类型 | 配置项 | `ignore` | `commit` | `commit_and_input` |
|----------|--------|----------|----------|-------------------|
| 数字键 | `overflow_behavior.number_key` | 忽略 | 顶字上屏 | 顶字上屏并输入数字 |
| 二三候选键 | `overflow_behavior.select_key` | 忽略 | 顶字上屏 | 顶字上屏并输入原字符 |
| 以词定字键 | `overflow_behavior.select_char_key` | 忽略 | 顶字上屏 | 顶字上屏并输入原字符 |

## 临时英文模式

中文模式下，按 `Shift + 字母` 可临时输入英文，输入完成后自动切回中文。

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 启用 | `input.shift_temp_english.enabled` | 开启/关闭临时英文 |
| 显示英文候选 | `input.shift_temp_english.show_english_candidates` | 在候选窗口中显示英文候选 |
| Shift 行为 | `input.shift_temp_english.shift_behavior` | `temp_english`（临时英文）或 `direct_commit`（直接上屏大写字母） |
| 符号触发 | `input.shift_temp_english.trigger_keys` | 按指定符号键也进入临时英文 |

## 临时拼音模式

五笔等非拼音方案下，可通过特定按键触发临时拼音输入：

| 触发键 | 配置值 | 说明 |
|--------|--------|------|
| 反引号 | `backtick` | 按 `` ` `` 触发 |
| 分号 | `semicolon` | 按 `;` 触发 |
| Z 键 | `z` | 按 Z 触发 |

配置项：`input.temp_pinyin.trigger_keys`

## CapsLock 行为

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 切换时取消 CapsLock | `input.capslock_behavior.cancel_on_mode_switch` | 通过 CapsLock 切换中英文时自动取消 CapsLock 锁定状态 |

## 自动标点配对

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 中文自动配对 | `input.auto_pair.chinese` | 输入左括号自动补右括号 |
| 英文自动配对 | `input.auto_pair.english` | 英文括号也自动配对 |
| 应用黑名单 | `input.auto_pair.blacklist` | 在指定应用中禁用自动配对 |

## 自定义标点映射

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 启用 | `input.punct_custom.enabled` | 开启自定义标点映射 |
| 映射规则 | `input.punct_custom.mappings` | 自定义每个标点键在不同模式下的输出 |

## 快捷输入

| 选项 | 配置项 | 说明 |
|------|--------|------|
| 触发键 | `input.quick_input.trigger_keys` | 触发快捷输入的按键（空列表=关闭） |
| 强制竖排 | `input.quick_input.force_vertical` | 快捷输入候选竖排显示 |
| 小数位数 | `input.quick_input.decimal_places` | 计算结果保留小数位数（0=取整） |
