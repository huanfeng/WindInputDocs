# 方案配置详解

::: warning 高级主题
本文面向需要手动编辑方案配置文件的用户。普通用户通过设置工具和[方案介绍](/schema/)页面即可完成日常配置。
:::

每个方案有独立的 YAML 配置文件，位于 `%APPDATA%\WindInput\data\schemas\` 目录：

| 文件 | 方案 |
|------|------|
| `pinyin.schema.yaml` | 全拼 |
| `shuangpin.schema.yaml` | 双拼 |
| `wubi86.schema.yaml` | 五笔 86 |
| `wubi86_pinyin.schema.yaml` | 五笔拼音混输 |

## 五笔引擎配置 {#五笔引擎配置}

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

## 混输引擎配置 {#混输引擎配置}

五笔拼音混输在 `wubi86_pinyin.schema.yaml` 的 `engine.mixed` 中：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `primary_schema` | 主方案（五笔） | `wubi86` |
| `secondary_schema` | 辅助方案（拼音） | `pinyin` |
| `min_pinyin_length` | 最短拼音编码长度 | `2` |
| `codetable_weight_boost` | 码表权重倍数 | `10000000` |
| `show_source_hint` | 显示匹配来源提示 | `false` |
| `z_key_repeat` | Z 键重复/学习 | `true` |

## 拼音引擎配置 {#拼音引擎配置}

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

## 模糊音 {#模糊音}

模糊音在方案配置文件的 `engine.pinyin.fuzzy` 中设置。全拼和双拼方案支持以下 11 组模糊音：

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

## 编码器（五笔词组自动编码）

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

公式语法：

| 符号 | 含义 |
|------|------|
| `A`, `B`, `C`, `Z` | 第 1、2、3、末个字 |
| `a`, `b` | 该字的第 1、2 个编码 |

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

## 词库权重

方案中的 `dictionaries` 可以配置 `weight_spec` 控制词库权重分布：

```yaml
dictionaries:
  - id: pinyin_main
    weight_spec:
      median: 200               # 中位权重
      max: 19260817             # 最大权重
      mode: log                 # 权重模式：linear（线性）, log（对数）
```

## 反查词库

拼音方案可以配置反查词库，在编码提示中显示其他方案的编码：

```yaml
dictionaries:
  - id: pinyin_main
  - id: wubi86_reverse           # 五笔反查词库
    reverse_lookup: true
```

## 短语文件

每个方案可以搭配一个短语文件 `<方案ID>.phrases.yaml`，用于定义自定义词条。短语文件会在方案加载时自动读取，词条参与候选排序。

如需创建自定义方案，请参阅[方案配置制作](/schema/custom)。
