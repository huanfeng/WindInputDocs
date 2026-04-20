# 词频功能（自动调频）测试流程

## 前置条件

- 已构建并安装最新版 WindInput
- 五笔和拼音方案均可正常使用

## 一、开关验证

### 1.1 默认关闭状态

1. 确认 `data/schemas/wubi86.schema.yaml` 中 `learning.mode: manual`
2. 确认 `data/schemas/pinyin.schema.yaml` 中 `learning.mode: manual`
3. 打开记事本，五笔模式下反复选择同一个非首位候选（如输入 `sf` 选第3个词）
4. 关闭输入法，检查用户词库文件 `user_words_wubi86.txt` **不应有新增词条**
5. 拼音模式同理：输入 `nihao` 反复选择非首位候选
6. 检查 `user_words_pinyin.txt` **不应有新增词条**

**预期：** mode=manual 时，选词不触发任何学习

### 1.2 开启词频

1. 修改 `wubi86.schema.yaml`：
   ```yaml
   learning:
     mode: auto
     protect_top_n: 3
   ```
2. 修改 `pinyin.schema.yaml`：
   ```yaml
   learning:
     mode: auto
     unigram_path: "dict/pinyin/unigram.txt"
   ```
3. 重启输入法服务（右键菜单 → 重启服务）

---

## 二、五笔词频测试

### 2.1 首选保护 (protect_top_n)

**目标：** 码表前 3 位不会被自动调频影响

1. 输入 `sf`，记录候选列表前 3 个词
2. 反复选择第 4 位或更后的候选（如果是多字词），选择 5 次以上
3. 再次输入 `sf`
4. **预期：** 前 3 位顺序不变，第 4 位之后可能发生变化

### 2.2 单字保护

**目标：** 单字不参与自动调频

1. 输入 `g`，选择任意单字候选，重复 10 次
2. 检查 `user_words_wubi86.txt`
3. **预期：** 不应有单字被写入用户词库

### 2.3 误选保护 (count threshold)

**目标：** 新词需要选中 3 次后才开始提权

1. 输入一个有多个多字词候选的编码（如 `sf`）
2. 选择一个排名较后的多字词，只选 1 次
3. 重新输入同一编码
4. **预期：** 该词排名不应明显上升（count=1，未达阈值 3）
5. 再选择同一个词 2 次（共 3 次）
6. 重新输入同一编码
7. **预期：** 该词排名应有所上升

### 2.4 权重上限

1. 持续选择同一个非保护区词条 50 次以上
2. 打开 `user_words_wubi86.txt`
3. **预期：** 该词的 weight 不应超过 2000

### 2.5 不在码表中的词

1. 通过用户词库手动添加一个自造词（编码 + 多字词）
2. 在候选中选择该词
3. **预期：** 该词的 weight 和 count 应正常递增

---

## 三、拼音词频测试

### 3.1 多字词学习

1. 输入 `nihao`，选择 "你好"
2. 重复选择 3 次
3. 再次输入 `nihao`
4. **预期：** "你好" 的排名应提升（如果原来不是第一位）

### 3.2 单字不写入 UserDict

1. 输入 `ni`，选择单字 "你"，重复 5 次
2. 检查 `user_words_pinyin.txt`
3. **预期：** "你" 不应出现在用户词库中
4. **注意：** 拼音单字会更新 Unigram 频率（影响造句），但不写入 UserDict

### 3.3 分步确认场景

1. 输入长拼音如 `wobuzhidao`
2. 先选择 "我不" 确认（分步确认）
3. 再选择 "知道" 确认
4. **预期：** "我不" 和 "知道" 都应被学习（各自使用对应的 consumedCode）

### 3.4 误选保护

1. 输入 `nihao`，选择一个罕见词（如 "泥号"），只选 1 次
2. 重新输入 `nihao`
3. **预期：** 该罕见词不应跳到前列（count=1，未达阈值 2）

---

## 四、鼠标选词测试

**目标：** 验证鼠标点击候选也能触发词频学习

1. 开启词频学习（mode: auto）
2. 输入编码，用鼠标点击候选列表中的一个多字词
3. 重复 3 次以上
4. 检查用户词库文件
5. **预期：** 被点击的词应出现在用户词库中，count 和 weight 正常递增

---

## 五、恢复默认测试

**目标：** 右键菜单"恢复默认"只移除 Shadow pin 规则，不清除词频数据

1. 对某个词先通过词频学习提升权重
2. 对同一个词右键 → 置顶
3. 右键 → 恢复默认
4. **预期：** Shadow 规则被移除，但用户词库中的词频记录保留

---

## 六、持久化测试

1. 开启词频，选词若干次
2. 正常关闭输入法服务
3. 重新启动输入法服务
4. 检查用户词库文件
5. **预期：** 所有词频数据（weight, count）应被正确保存和恢复

---

## 七、自动化单元测试

在项目根目录运行：

```bash
# UserDict 词频防护测试
go test ./internal/dict/ -run "IncreaseWeight|OnWordSelected|SaveLoadWithCount" -v

# 五笔引擎词频学习测试
go test ./internal/engine/wubi/ -run "OnCandidateSelected|GetOriginalRank" -v

# 全量回归测试
go test ./... -count=1
```

### 单元测试覆盖矩阵

| 测试用例 | 验证点 |
|---------|--------|
| `TestIncreaseWeight_MaxDynamicWeight` | 权重上限截断 |
| `TestIncreaseWeight_CountIncrement` | count 自增 |
| `TestIncreaseWeight_NonExistentWord` | 不存在词不崩溃 |
| `TestOnWordSelected_NewWord` | 新词创建 |
| `TestOnWordSelected_BelowThreshold` | 阈值前不提权 |
| `TestOnWordSelected_MaxWeight` | 提权上限截断 |
| `TestOnWordSelected_CaseInsensitive` | 大小写兼容 |
| `TestUserDict_SaveLoadWithCount` | count 持久化 |
| `TestWubiOnCandidateSelected_DisabledByDefault` | 关闭时不学习 |
| `TestWubiOnCandidateSelected_SingleCharSkipped` | 单字跳过 |
| `TestWubiOnCandidateSelected_ProtectTopN` | 首选保护 |
| `TestWubiOnCandidateSelected_BeyondProtectTopN` | 保护区外可学习 |
| `TestWubiOnCandidateSelected_NotInCodeTable` | 非码表词可学习 |
| `TestWubiGetOriginalRank` | 排名查询 |
