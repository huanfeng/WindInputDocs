# 方案配置制作

本文面向需要创建自定义输入方案或深度修改现有方案的用户。普通用户通过设置工具即可完成配置，无需手动编辑方案文件。

## 方案文件结构

方案文件为 YAML 格式，位于 `%APPDATA%\WindInput\schemas\` 目录，命名格式为 `<方案ID>.schema.yaml`。基本结构如下：

```yaml
schema:
  name: "我的方案"
  schema_id: "my_schema"
  version: "1.0"

engine:
  type: pinyin          # 引擎类型：pinyin, codetable, mixed
  # ... 引擎相关配置

dictionaries:            # 词库列表
  - id: main_dict

learning:                # 学习与调频
  auto_learn:
    enabled: false
  freq:
    enabled: false
```

## 引擎类型

方案的核心是引擎配置，决定了输入的匹配和排序方式。

### 拼音引擎（pinyin）

适用于全拼和双拼方案：

```yaml
engine:
  type: pinyin
  pinyin:
    scheme: full                 # full（全拼）或 shuangpin（双拼）
    show_code_hint: true         # 显示编码提示
    use_smart_compose: true      # 智能组词
    candidate_order: smart       # char_first, phrase_first, smart

    # 双拼配置（scheme 为 shuangpin 时生效）
    shuangpin:
      layout: xiaohe             # xiaohe, ziranma, mspy, sogou, abc, ziguang

    # 模糊音配置
    fuzzy:
      zh_z: false
      ch_c: false
      sh_s: false
      n_l: false
      r_l: false
      f_h: false
      an_ang: false
      en_eng: false
      in_ing: false
      ian_iang: false
      uan_uang: false
```

### 码表引擎（codetable）

适用于五笔等基于编码表的方案：

```yaml
engine:
  type: codetable
  codetable:
    max_code_length: 4           # 最大编码长度
    auto_commit_unique: false    # 四码唯一自动上屏
    top_code_commit: true        # 五码顶字上屏
    punct_commit: true           # 标点顶字上屏
    clear_on_empty_max: false    # 四码空码自动清空
    show_code_hint: true         # 显示编码提示
    single_code_input: false     # 单编码输入模式
    candidate_sort_mode: frequency  # 候选排序模式
    z_key_repeat: true           # Z 键重复/学习
```

### 混合引擎（mixed）

五笔 + 拼音混合输入，五笔优先、拼音兜底：

```yaml
engine:
  type: mixed
  mixed:
    primary_schema: wubi86       # 主方案（码表）
    secondary_schema: pinyin     # 辅助方案（拼音）
    min_pinyin_length: 2         # 最短拼音编码长度
    codetable_weight_boost: 10000000  # 码表权重倍数
    show_source_hint: false      # 显示匹配来源提示
    z_key_repeat: true           # Z 键重复/学习
    topcode_override_pinyin: false  # 歧义串顶码偏好：当前缀既是完整拼音音节又是终止性五笔全码时（如 wang/aipu），
                                    # false（默认）=维持拼音保护；true=放行顶码倒向五笔连打
```

::: tip `topcode_override_pinyin` 说明
混输模式下，当输入的编码既是一个完整拼音音节（如 `wang`），又是一个终止性的五笔精确全码时，存在"顶码歧义"——系统无法从编码区分用户意图。

- **`false`（默认）**：维持拼音保护，不触发顶码，适合习惯打 `wang ba`、`ai pu` 等拼音词的用户
- **`true`**：放行顶码，倒向五笔连打，适合五笔优先且不担心误顶的用户

此开关仅影响歧义串，不影响非歧义编码的正常顶码行为。修改后热更新生效，无需重启。
:::

## 词库配置

### 词库列表

每个方案的 `dictionaries` 数组列出所有可用词库，按角色分两类：

- **主词库** — 仅 1 个，`default: true` 标记，始终启用，包含主要词条
- **附加词库** — 任意多个，可被用户独立开关，常用于扩展词、emoji、行业词、地名等

```yaml
dictionaries:
  - id: wubi86_main              # 主词库
    label: "极点五笔主词库"
    description: "极点五笔基础词库，含单字与高频词组"
    path: "wubi86/wubi86_jidian.dict.yaml"
    type: rime_codetable
    default: true                # 标记为主词库

  - id: wubi86_emoji             # 附加词库
    label: "Emoji 表情"
    description: "按五笔编码检索 emoji；输入 emoj 可查看常用表情"
    path: "wubi86/wubi86_jidian_emoji.dict.yaml"
    type: rime_codetable
    default_enabled: true        # 方案默认启用
    weight_as_order: true
```

#### 词库条目字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 词库 ID，全局唯一；缓存文件名按 `<schemaID>_<dictID>` 组合 |
| `label` | string | UI 显示名称，留空时回退为 `id` |
| `description` | string | 备注说明，显示在设置工具开关下方的小字提示 |
| `path` | string | 词库文件路径，相对 `data\` / `userdata\` 根目录 |
| `type` | string | 词库类型，如 `rime_codetable`、`rime_dict` 等 |
| `default` | bool | 是否为主词库；每个方案有且仅有一个主词库 |
| `default_enabled` | bool | 附加词库的方案默认启用状态；省略时视为 `true` |
| `enabled` | bool | 用户覆盖的启用状态；由设置工具写入用户方案文件，未设置时继承 `default_enabled` |
| `weight_spec` | object | 权重归一化参数，见下文 |
| `weight_as_order` | bool | 权重仅表示同码内排序序号，不参与跨码比较 |

启用判定优先级：**`enabled` > `default_enabled` > 默认 `true`**。主词库（`default: true`）始终启用，`enabled` 字段对其无效。

::: tip 附加词库的热重载
在设置工具中切换附加词库开关会即时生效，无需重启输入法：开关写入用户数据目录下 `schemas\<方案ID>.schema.yaml` 的 `dictionaries[].enabled` 字段，输入服务监听到方案文件变更后自动重载对应附加层。\
不同方案的附加层按 `<schemaID>__<dictID>` 命名隔离，切走再切回不会丢失启用状态，也不会污染其他方案。
:::

### 词库权重

通过 `weight_spec` 控制词库在候选排序中的权重分布：

```yaml
dictionaries:
  - id: pinyin_main
    weight_spec:
      median: 200                # 中位权重
      max: 19260817              # 最大权重
      mode: log                  # 权重模式：linear（线性）, log（对数）
```

如果码表词库的权重不是真实词频，而是同编码内的重码序号（如极点五笔的 10/20/30/40），可以添加 `weight_as_order: true`。启用后前缀匹配候选按码表文件顺序排列，避免重码加权导致的排序异常：

```yaml
dictionaries:
  - id: wubi86_main
    weight_as_order: true        # 权重仅表示同码内排序序号
    weight_spec:
      median: 10
      max: 890
      mode: linear
```

### 反查词库

拼音方案可以配置反查词库，在编码提示中显示其他方案的编码：

```yaml
dictionaries:
  - id: pinyin_main
  - id: wubi86_reverse           # 五笔反查词库
    reverse_lookup: true
```

## 编码器

编码器根据规则自动为词组生成编码，常用于五笔方案：

```yaml
encoder:
  max_word_length: 10           # 最大词长
  rules:
    - length_equal: 2           # 二字词取码规则
      formula: "AaAbBaBb"       # 第一字前两码 + 第二字前两码
    - length_equal: 3           # 三字词
      formula: "AaBaCaCb"       # 前两字首码 + 第三字前两码
    - length_in_range: [4, 10]  # 四字及以上
      formula: "AaBaCaZa"       # 前三字首码 + 末字首码
```

公式语法说明：

| 符号 | 含义 |
|------|------|
| `A`, `B`, `C`, `Z` | 第 1、2、3、末个字 |
| `a`, `b` | 该字的第 1、2 个编码 |
| `Aa` | 第 1 个字的第 1 个编码 |
| `Ab` | 第 1 个字的第 2 个编码 |

## 学习与调频

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

## 临时拼音模式

在非拼音方案中，可配置临时拼音模式，让用户在忘记编码时临时使用拼音输入：

```yaml
engine:
  codetable:
    # ... 其他配置
  temp_pinyin:
    trigger_keys:
      - "backtick"              # 触发键：backtick, semicolon, z
```

## 短语文件

每个方案可以搭配一个短语文件 `<方案ID>.phrases.yaml`，用于定义自定义词条：

```yaml
# 自定义词条，编码在前，文字在后
mycode: 我的自定义词
shortcut: 快捷输入
```

短语文件会在方案加载时自动读取，词条会参与候选排序。

## 创建自定义方案示例

以下是一个简化版五笔方案的完整示例：

```yaml
schema:
  name: "简版五笔"
  schema_id: "simple_wubi"
  version: "1.0"

engine:
  type: codetable
  codetable:
    max_code_length: 4
    auto_commit_unique: true
    top_code_commit: true
    punct_commit: true
    show_code_hint: true
    z_key_repeat: true

dictionaries:
  - id: wubi86_main

encoder:
  max_word_length: 10
  rules:
    - length_equal: 2
      formula: "AaAbBaBb"
    - length_equal: 3
      formula: "AaBaCaCb"
    - length_in_range: [4, 10]
      formula: "AaBaCaZa"

learning:
  auto_learn:
    enabled: true
  freq:
    enabled: true
    protect_top_n: 3
```

将此文件保存为 `%APPDATA%\WindInput\schemas\simple_wubi.schema.yaml`，然后在全局配置的 `schema.available` 中添加 `"simple_wubi"`，即可通过 `Ctrl + Shift + E` 切换到该方案。

## 注意事项

- 方案 ID 必须与文件名前缀一致（如 `my_schema.schema.yaml` 的 ID 为 `my_schema`）
- 词库文件需放置在 `%APPDATA%\WindInput\schemas\` 目录下
- 修改方案文件后需要重启输入法或切换方案才能生效
- 建议先导出内置方案作为模板，在其基础上修改
- 详细的全局配置参考请参阅[配置机制与全局配置](/config/)
