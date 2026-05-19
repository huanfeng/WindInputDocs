# 方案配置详解

::: warning 高级主题
本文面向需要手动编辑方案配置文件的用户。普通用户通过设置工具和[方案介绍](/schema/)页面即可完成日常配置。
:::

每个方案有独立的 YAML 配置文件，位于 `%APPDATA%\WindInput\schemas\` 目录：

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
| `single_code_input` | 逐字键入模式（关闭前缀匹配） | `false` |
| `single_code_complete` | 逐码空码补全（逐码模式下精确无候选时取更长编码首个候选） | `true` |
| `candidate_sort_mode` | 候选排序模式：`frequency`（词频）、`natural`（自然顺序） | `frequency` |
| `z_key_repeat` | Z 键重复/学习 | `true` |
| `dedup_candidates` | 候选去重（按 text 保留先出现） | `true` |
| `skip_single_char_freq` | 单字不自动调频（避免高频单字越用越靠前） | `false` |
| `load_mode` | 码表加载模式 | 由 schema 内部决定 |
| `prefix_mode` | 前缀匹配模式：`sequential` / `bfs_bucket` / `none` | `bfs_bucket` |
| `bucket_limit` | bfs_bucket 模式下每桶候选上限 | 内部默认 |
| `weight_mode` | 权重模式：`global` / `inner_order` 等 | 内部默认 |
| `short_code_first` | 短码优先（短编码候选靠前） | 由 schema 决定 |
| `charset_preference` | 字符集偏好（同候选下优先显示的字符集） | 空 |

### 临时拼音子配置 (`temp_pinyin`)

码表方案可在 `engine.codetable.temp_pinyin` 中启用"忘码时切到拼音输入":

```yaml
engine:
  codetable:
    temp_pinyin:
      enabled: true               # 是否启用临时拼音
      schema: pinyin              # 使用的拼音方案 ID（默认 pinyin；已废弃, 推荐用全局 primary_pinyin）
```

| 字段 | 说明 | 默认值 |
|---|---|---|
| `enabled` | 是否启用临时拼音 (五笔方案下按 `` ` `` 切换) | `true`（向后兼容） |
| `schema` | 使用的拼音方案 ID | 全局 `primary_pinyin` 优先 |

::: tip 设计取舍
临时拼音激活时, 短语词库 (PhraseLayer) 的命令短语不会被命中 (例如临时拼音里输 `zzbd` **不会**看到"标点"字符组), 让输入流回归"纯拼音"语义; 简拼仍然保留。
:::

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
| `enable_abbrev_match` | 启用简拼匹配（混输模式下默认关闭, 避免和五笔编码冲突） | `false` |
| `pinyin_only_overflow` | 编码超过最大码长时仅查拼音 | `true` |
| `enable_english` | 启用英文候选（混输直接出英文词条） | `false` |

::: tip
混输 boost (`codetable_weight_boost`) 是 **层间隔离机制** —— 码表层 (含短语 + 用户词库 + 系统码表) 整体被压在拼音字之前, 让用户输码表编码时即便恰好与拼音冲突也能稳定靠前。该 boost **不写入存储**, 用户在设置里看到的 weight 永远是 0~10000 那个值。
:::

## 拼音引擎配置 {#拼音引擎配置}

全拼和双拼在方案文件的 `engine.pinyin` 中：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `scheme` | 拼音方案：`full`（全拼）, `shuangpin`（双拼） | — |
| `show_code_hint` | 显示编码提示 | `true` |
| `use_smart_compose` | 智能组词 | `true` |
| `candidate_order` | 候选排序：`char_first`, `phrase_first`, `smart` | `smart` |
| `dict_format` | 词库格式：`dat` (默认, 适合大词库), `wdb` | `dat` |

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
      formula: "AaBaCaCb"       # 前两字首码 + 第三字前两码
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
  # 拼音方案: 选词即学的自动造词
  auto_learn:
    enabled: false              # 是否启用自动造词
    count_threshold: 2          # 误选保护阈值
    min_word_length: 2          # 最小造词字数
    weight_delta: 20            # 每次选词权重增量
    add_weight: 800             # 新词初始权重
  # 码表方案: 连续单字 + 终止符 = 自动组词
  auto_phrase:
    enabled: false
    min_phrase_len: 2           # 最小造词字数
    max_phrase_len: 5           # 最大造词字数
    add_weight: 800             # 新词初始权重
    weight_delta: 20            # 每次命中权重增量
    count_threshold: 2          # 误选保护阈值
  # 自动调频 (按"用得越多排得越前"动态调整候选 weight)
  freq:
    enabled: false              # 是否启用自动调频
    protect_top_n: 0            # 锁定前 N 位候选位置 (默认不锁定)
    half_life: 72               # 半衰期 (小时)
    boost_max: 2000             # 加成上限 (自动调频不会让一条词的 weight 涨过 2000)
    max_recency: 300            # 时间衰减峰值
    base_scale: 100             # base 系数
    streak_scale: 50            # 连续选择系数
    streak_cap: 250             # 连续选择上限
  temp_max_entries: 5000        # 临时词库最大条目数
  temp_promote_count: 5         # 选择几次后晋升到用户词库
```

各字段说明：

### `auto_learn` (拼音)

| 字段 | 说明 | 默认值 |
|---|---|---|
| `enabled` | 是否启用自动造词 | `false` |
| `count_threshold` | 误选保护阈值（要被选过多少次才视为有效造词） | `2` |
| `min_word_length` | 最小造词字数 | `2` |
| `weight_delta` | 每次选词权重增量 | `20` |
| `add_weight` | 新词初始权重 | `800` |

### `auto_phrase` (码表)

| 字段 | 说明 | 默认值 |
|---|---|---|
| `enabled` | 是否启用 | `false` |
| `min_phrase_len` | 最小造词字数 | `2` |
| `max_phrase_len` | 最大造词字数 | `5` |
| `add_weight` | 新词初始权重 | `800` |
| `weight_delta` | 每次命中权重增量 | `20` |
| `count_threshold` | 误选保护阈值 | `2` |

### `freq` (自动调频)

| 字段 | 说明 | 默认值 |
|---|---|---|
| `enabled` | 是否启用 | `false` |
| `protect_top_n` | 锁定前 N 位候选位置 | `0` (不锁定) |
| `half_life` | 半衰期 (小时, 决定调频"记忆"长短) | `72` |
| `boost_max` | 调频加成上限 (单条词 weight 最多被调到 +2000) | `2000` |
| `max_recency` | 时间衰减峰值 | `300` |
| `base_scale` | base 系数 | `100` |
| `streak_scale` | 连续选择系数 | `50` |
| `streak_cap` | 连续选择上限 | `250` |

### 临时词库

| 字段 | 说明 | 默认值 |
|---|---|---|
| `temp_max_entries` | 临时词库最大条目数 (超限按 LRU 淘汰) | `5000` |
| `temp_promote_count` | 临时词被选择 N 次后晋升到用户词库 | `5` |

::: tip
临时词库 (TempLayer) 是用户词库 (UserLayer) 的"前置队列": 新学的词先进临时层观察, 命中阈值后自动晋升。这避免一次性误选直接污染用户词库。
:::

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

### 权重作为排序序号 {#weight-as-order}

某些码表词库（如极点五笔）的权重并非真实词频，而是同编码内的重码序号（如 10/20/30/40）。这会导致前缀匹配时重码多的生僻字（权重被叠加到 40）排在重码少的常用字（权重 10）前面。

通过 `weight_as_order` 标记此类词库，启用后前缀匹配候选在同一剩余码长层内权重被统一，按码表文件的原始顺序排列，精确匹配不受影响：

```yaml
dictionaries:
  - id: wubi86_main
    weight_as_order: true       # 权重仅表示同码内排序序号，不参与跨码比较
    weight_spec:
      median: 10
      max: 890
```

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `weight_as_order` | 权重仅表示同码内排序序号，前缀匹配时抹平权重差异 | `false` |

## 反查词库

拼音方案可以配置反查词库，在编码提示中显示其他方案的编码：

```yaml
dictionaries:
  - id: pinyin_main
  - id: wubi86_reverse           # 五笔反查词库
    reverse_lookup: true
```

## 拆字提示

五笔等形码方案可挂拆字数据库, 在候选条目上显示构字信息:

```yaml
engine:
  chaizi:
    db_path: "chaizi.db"          # 拆字数据库路径 (相对词库目录或绝对路径)
    font_family: "PinyinSC.ttf"   # 显示拆字所用的字体 (空 = 用默认字体)
    font_dw_name: "Source Han"    # DirectWrite 字体族名 (字体已装到系统时优先用)
```

| 字段 | 说明 |
|---|---|
| `db_path` | 拆字数据库文件路径 |
| `font_family` | 字体文件路径 (落到词库目录) |
| `font_dw_name` | DirectWrite 字体族名, 字体已系统注册时优先使用 |

## 短语词库的存储

短语词库 (PhraseLayer) 是**全局共享**的 (不区分方案), 数据最终存放在 `user_data.db` 的 Phrases bucket 中, 编辑入口在 **设置 → 词库 → 短语**。

启动时引擎会读 `system.phrases.yaml` 作为**系统种子**, 把内置短语合并到 db 中:

| 路径 | 角色 |
|---|---|
| `<安装目录>/data/system.phrases.yaml` | 程序自带的系统短语种子, 只读, 升级时随安装包替换 |
| `%APPDATA%/WindInput/system.phrases.yaml` | 用户目录的同名覆盖文件, 存在时优先使用 (用于自定义系统种子) |

::: warning yaml 不是用户编辑入口
不要直接编辑 `system.phrases.yaml` 来添加自己的短语 — 它仅用作系统种子, 重装 / 升级时可能被覆盖, 且改动不会自动同步进 db。**用户自定义短语**请通过 设置 → 词库 → 短语 的 UI 添加, 它会直接写入 db, 跨方案立即生效。
:::

::: tip 短语 vs 用户词库
短语 (PhraseLayer) **全局共享**, 不区分方案。每个方案的**用户词库** (StoreUserLayer) 按方案 ID 隔离, 拼音家族 (全拼/双拼) 共享同一份, 详见 [数据共享与隔离](#数据共享与隔离)。
:::

## 数据共享与隔离

### 拼音家族共享用户数据

全拼 (`pinyin`) 与双拼 (`shuangpin`) 的用户词库、调频、临时词库统一存储在 `pinyin` bucket 下 (代码常量 `PinyinSharedDictID`)。这样双拼用户切到全拼仍能看到自己学过的词。

混输方案则与其主形码方案 (例如 `wubi86_pinyin` 的 `primary_schema: wubi86`) 共享用户数据 — 五笔学过的词在混输下立刻可用。

| 方案 | 实际数据 bucket |
|---|---|
| `pinyin` (全拼) | `pinyin` |
| `shuangpin` (双拼) | `pinyin` (与全拼共享) |
| `wubi86` (五笔) | `wubi86` |
| `wubi86_pinyin` (混输) | `wubi86` (与五笔共享) |

### 短语词库全局, 系统码表按方案

| 数据类 | 隔离方式 |
|---|---|
| 短语词库 (PhraseLayer) | **全局**, 所有方案共用 |
| 系统码表 (各方案 dictionaries) | **按方案** |
| 用户词库 / 临时词库 / 调频 | **按方案数据 bucket** (拼音家族 / 混输有共享, 见上表) |

## 设计中的注意事项

### 临时拼音是"独立查询路径"

码表方案下进入临时拼音 (按 `` ` ``) 时, 仅拼音词库参与查询。短语词库 (PhraseLayer) 的命令短语在临时拼音下**不**触发, 例如临时拼音中输 `zzbd` 看到的是"祖祖辈辈"等拼音简拼候选, 而非"标点"字符组 nav。这是为了让临时拼音回归"纯拼音"语义。

简拼 (`zg` → 中国) 在临时拼音下**保留**。

### 混输 `enable_abbrev_match` 默认 false

混输方案下简拼匹配默认关闭, 避免和五笔编码冲突 (例如 `zgrm` 是常用简拼但也是有效五笔编码)。如希望在拼音兜底时也支持简拼, 设 `enable_abbrev_match: true`。

### Z 键重复 vs 临时拼音

`z_key_repeat: true` 时, 输入 `z` 触发"重复上次上屏候选"; 临时拼音又用 `z` (或 `` ` ``) 作为切换键。两个功能可以共存 — 引擎按"前缀有效性"做渐进决策: 如果 `z` 后续还能扩展出码表/短语候选则正常输入, 否则把首 `z` 视作临时拼音触发键。

### 短语候选不会被生僻字过滤

智能过滤 (码表方案下"看不到生僻字") 路径里, 短语永远保留, 也不计入"同编码下是否有常用字"的判定。这让用户配置 `dz = 我的地址` 不会副作用地改变同编码 (dz) 的码表过滤行为。

如需创建自定义方案，请参阅[方案配置制作](/schema/custom)。
