# WindInput 内存优化技术文档

## 概述

WindInput 输入法服务在初始版本中存在内存占用过高的问题，静态基线约 900MB，运行时波动可达 100+MB。经过两个阶段的优化，将基线内存降至 ~60MB，运行时波动控制在合理范围内。

| 指标 | 优化前 | 第一阶段后 | 第二阶段后 |
|------|--------|-----------|-----------|
| 静态基线 | ~900MB | ~60MB | ~60MB |
| 运行时峰值 | 不可控 | ~100+MB | ~80MB |
| 焦点切换波动 | - | 60→100+MB | 显著降低 |
| 拼音按键波动 | - | 较大 | 显著降低 |

---

## 第一阶段：词库预编译二进制格式 + mmap 内存映射

**提交**: `e2408be feat: 词库预编译二进制格式 + mmap 内存映射，大幅降低内存占用`

### 问题分析

原始方案在启动时将全量词库（YAML 格式）和 Unigram 语言模型（TXT 格式）解析后加载到 Go 堆内存中：

- 拼音词库 ~8000 条 → 解析为 `map[string][]Candidate`，大量字符串和结构体占用堆内存
- Unigram 模型 ~20 万词条 → 存储为 `map[string]float64`
- 所有数据驻留在 Go 堆中，GC 需要扫描全部对象，导致 GC 压力巨大

### 解决方案

将词库和语言模型预编译为紧凑的二进制格式（`.wdb`），运行时通过 Windows mmap（内存映射文件）加载，数据不进入 Go 堆。

### 二进制格式设计

#### 拼音词库 `pinyin.wdb`

```
┌────────────────────────────────────────┐
│ DictFileHeader (32 bytes)              │
│   Magic: "WDIC"                        │
│   Version: 1                           │
│   KeyCount, IndexOff, DataOff, StrOff  │
│   AbbrevOff (0 = 无简拼索引)           │
├────────────────────────────────────────┤
│ KeyIndex 区 (每条 12 bytes)            │
│   CodeOff(4) + CodeLen(2)              │
│   EntryOff(4) + EntryLen(2)            │
├────────────────────────────────────────┤
│ EntryRecords 区 (每条 10 bytes)        │
│   TextOff(4) + TextLen(2) + Weight(4)  │
├────────────────────────────────────────┤
│ StringPool 区 (共享字符串存储)         │
├────────────────────────────────────────┤
│ Abbrev Section (可选, 简拼索引)        │
│   AbbrevHeader(16) + AbbrevIndex[]     │
└────────────────────────────────────────┘
```

#### Unigram 模型 `unigram.wdb`

```
┌────────────────────────────────────────┐
│ UnigramFileHeader (24 bytes)           │
│   Magic: "WUNI"                        │
│   Version: 1                           │
│   KeyCount, IndexOff, StrOff           │
├────────────────────────────────────────┤
│ KeyIndex 区 (每条 12 bytes)            │
│   KeyOff(4) + KeyLen(2)                │
│   LogProb(float32, 4) + Reserved(2)    │
├────────────────────────────────────────┤
│ StringPool 区 (所有词语字符串)         │
└────────────────────────────────────────┘
```

### mmap 内存映射实现

通过 Windows API 实现零复制加载：

```
MmapOpen(path) 执行流程：

1. CreateFile(path, GENERIC_READ, FILE_SHARE_READ)
   → 以只读共享方式打开文件

2. CreateFileMapping(fileH, PAGE_READONLY, size)
   → 创建文件映射对象

3. MapViewOfFile(mappingH, FILE_MAP_READ, 0, 0, size)
   → 将文件映射到虚拟地址空间

4. unsafe.Slice((*byte)(addr), size)
   → 转换为 Go []byte 切片（绕过 Go 分配器）
```

关键优势：
- **零复制**：文件内容不复制到 Go 堆，直接映射为虚拟内存
- **惰性加载**：OS 按需从磁盘加载页面，未访问的部分不占物理内存
- **GC 无感知**：数据不在 Go 堆中，GC 不需要扫描
- **多进程共享**：多个进程映射同一文件时共享物理内存页

### 查找算法

词库查找使用二分搜索，直接在 mmap 映射的内存上操作：

- **精确查找**：`O(log n)` 二分搜索 KeyIndex，按字节偏移读取 StringPool 中的 key 进行比较
- **前缀查找**：先二分定位到第一个 >= prefix 的位置，再线性扫描直到不匹配
- **简拼查找**：在 Abbrev Section 中独立二分搜索

### UnigramLookup 接口

设计统一接口支持内存和 mmap 两种模式无缝切换：

```go
type UnigramLookup interface {
    LogProb(word string) float64       // 获取对数概率
    Contains(word string) bool          // 检查是否存在
    CharBasedScore(word string) float64 // 基于字的复合分数
    BoostUserFreq(word string, delta int) // 用户频次提升
}
```

| 特征 | UnigramModel (内存) | BinaryUnigramModel (mmap) |
|------|---------------------|---------------------------|
| 数据存储 | Go 堆 map | mmap 虚拟内存 |
| 查找复杂度 | O(1) hash | O(log n) 二分 |
| 内存占用 | 全量词库 (~6MB) | 仅热词页面 (<1MB) |
| GC 影响 | 需扫描全部对象 | 无 |
| 用户频次 | 堆内存 map | 堆内存 map (仅此部分) |

### 构建工具

新增 `gen_bindict` CLI 工具，在构建阶段将 YAML/TXT 词库预编译为 `.wdb`：

```bash
gen_bindict -type pinyin -input dict/pinyin/*.yaml -output dict/pinyin.wdb
gen_bindict -type unigram -input dict/unigram.txt -output dict/unigram.wdb
```

### 修改文件清单

| 文件 | 变更 |
|------|------|
| `internal/dict/binformat/format.go` | 二进制格式定义（结构体、常量） |
| `internal/dict/binformat/writer.go` | 词库写入器 |
| `internal/dict/binformat/reader.go` | 词库读取器（mmap + 二分搜索） |
| `internal/dict/binformat/unigram_writer.go` | Unigram 写入器 |
| `internal/dict/binformat/unigram_reader.go` | Unigram 读取器（mmap） |
| `internal/dict/binformat/mmap_windows.go` | Windows mmap 封装 |
| `internal/dict/pinyin_dict.go` | PinyinDict 添加 LoadBinary() |
| `internal/engine/pinyin/lm.go` | UnigramLookup 接口 + BinaryUnigramModel |
| `internal/engine/pinyin/pinyin.go` | Engine 初始化适配 |
| `internal/engine/manager.go` | 引擎管理器适配 |
| `internal/engine/pinyin/lattice.go` | 改用 PrefixSearchable 接口 |
| `cmd/gen_bindict/main.go` | 预编译工具 |
| `build_all.ps1` | 构建脚本适配 |
| `installer/install.ps1` | 安装脚本适配 |

### 效果

- 基线内存从 **~900MB 降至 ~60MB**（降幅 93%）
- GC 压力大幅降低（堆对象数量减少数量级）
- 启动速度基本不变（mmap 映射几乎瞬时）

---

## 第二阶段：运行时内存波动治理

**提交**: `5d68d94 perf: 运行时内存波动治理——复用 Trie、缓存热键、优化分配策略`

### 问题分析

第一阶段后基线内存已降至 ~60MB，但存在两个运行时问题：

1. **拼音模式内存波动大**：每次按键触发完整候选生成管线，产生大量临时对象
2. **窗口焦点变化时内存飙升**：从 ~60MB 涨到 ~100+MB

#### 问题 1：候选生成的内存分配热点

| 热点 | 位置 | 问题 | 影响 |
|------|------|------|------|
| 每次重建 SyllableTrie | `engine_ex.go:48` | `NewPinyinParser()` 每次按键构建 ~400 音节 trie | 高 |
| candidatesMap 无预分配 | `engine_ex.go:69` | `make(map[string]*Candidate)` 频繁扩容 | 中 |
| lookupWithFuzzy seen map | `engine_ex.go:507` | 每次模糊查找创建新 map | 中 |
| Lattice seen map | `lattice.go:43` | BuildLattice 每次新建 map | 中 |
| latticeKey 临时字符串 | `lattice.go:172` | `strconv.Itoa` 产生临时分配 | 低 |

#### 问题 2：焦点变化时内存飙升

直接分配量很小（几 KB），真正原因是 **Go 运行时的内存管理策略**：

- **GOGC=100（默认值）**：堆内存翻倍时才触发 GC
- **内存不立即归还 OS**：GC 释放的内存仍被 Go 运行时持有
- **焦点事件触发连串小分配**：goroutine 创建、channel 分配、热键重新编译等累积推高堆水位
- **热键每次重新编译**：`Compile()` 在焦点变化时调用，配置不变时完全多余

### 修改详情

#### 修改 1：复用引擎 SyllableTrie

**文件**: `internal/engine/pinyin/engine_ex.go`

引擎已有 `e.syllableTrie` 字段，每次调用 `convertCore()` 和 `ParseInput()` 时不再重建：

```go
// 改前：每次按键重建 ~400 音节 trie
parser := NewPinyinParser()

// 改后：复用引擎的 trie
parser := NewPinyinParserWithTrie(e.syllableTrie)
```

`NewPinyinParserWithTrie` 已有现成实现，仅需调用。

#### 修改 2：缓存已编译的热键

**文件**: `internal/coordinator/coordinator.go`

添加热键缓存字段，仅配置变化时重新编译：

```go
type Coordinator struct {
    // ...
    cachedKeyDownHotkeys []uint32
    cachedKeyUpHotkeys   []uint32
    hotkeysDirty         bool
}

func (c *Coordinator) getCompiledHotkeys() ([]uint32, []uint32) {
    if !c.hotkeysDirty && c.cachedKeyDownHotkeys != nil {
        return c.cachedKeyDownHotkeys, c.cachedKeyUpHotkeys  // 直接返回缓存
    }
    c.cachedKeyDownHotkeys, c.cachedKeyUpHotkeys = c.hotkeyCompiler.Compile()
    c.hotkeysDirty = false
    return c.cachedKeyDownHotkeys, c.cachedKeyUpHotkeys
}
```

缓存失效时机：
- `UpdateHotkeyConfig()` — 快捷键配置变化
- `UpdateInputConfig()` — 选字键/翻页键变化

#### 修改 3：预分配 map 容量

**文件**: `internal/engine/pinyin/engine_ex.go`, `internal/engine/pinyin/lattice.go`

```go
// candidatesMap: 拼音候选通常 50-200 个，预分配 64
candidatesMap := make(map[string]*candidate.Candidate, 64)

// lookupWithFuzzy seen map: 按已有结果数预分配
seen := make(map[string]bool, len(results))

// Lattice seen map: 预分配 128
seen := make(map[string]bool, 128)
```

#### 修改 4：调整 Go 内存管理策略

**文件**: `cmd/service/main.go`

```go
// 软限制 150MB，超过后 GC 更频繁运行
debug.SetMemoryLimit(150 * 1024 * 1024)

// 降低 GOGC：默认 100 表示堆翻倍才 GC，改为 50 更频繁回收
debug.SetGCPercent(50)
```

**文件**: `internal/coordinator/coordinator.go`

在 `HandleFocusGained` 和 `HandleFocusLost` 后异步释放内存：

```go
defer func() {
    go func() {
        runtime.GC()
        debug.FreeOSMemory()
    }()
}()
```

异步执行不阻塞焦点事件的响应。

#### 修改 5：快速命令同步执行

**文件**: `internal/bridge/server.go`

焦点/IME/Caret 等快速命令跳过 goroutine + channel 分配，直接同步调用：

```go
func (s *Server) processRequestWithTimeout(...) []byte {
    // 快速命令直接同步执行
    switch header.Command {
    case CmdFocusGained, CmdFocusLost, CmdIMEActivated,
         CmdCompositionTerminated, CmdCaretUpdate:
        return s.processRequest(header, payload, clientID, processID)
    }

    // 耗时命令仍使用 goroutine + timeout
    // ...
}
```

每次焦点切换省去一个 goroutine 创建 + 一个 channel 分配。

#### 修改 6：优化 latticeKey 临时分配

**文件**: `internal/engine/pinyin/lattice.go`

使用 `strconv.AppendInt` + 固定大小 buffer 替代 `strconv.Itoa` + 字符串拼接：

```go
// 改前：3 次字符串分配 + 2 次拼接
return strconv.Itoa(start) + ":" + strconv.Itoa(end) + ":" + word

// 改后：1 次固定 buffer + 1 次拼接
var buf [24]byte
b := strconv.AppendInt(buf[:0], int64(start), 10)
b = append(b, ':')
b = strconv.AppendInt(b, int64(end), 10)
b = append(b, ':')
return string(b) + word
```

#### 修改 7：PushStateToAllClients 反向 PID 映射

**文件**: `internal/bridge/server.go`

添加 `pushHandleToPID` 反向映射，消除 O(n^2) PID 查找：

```go
type Server struct {
    // ...
    pushHandleToPID map[windows.Handle]uint32  // 新增反向映射
}

// 改前：对每个 handle 遍历 pushClientsByPID 查找 PID → O(n²)
for p, handle := range s.pushClientsByPID {
    if handle == h { pid = p; break }
}

// 改后：直接 O(1) 查找
pid := s.pushHandleToPID[h]
```

在注册/注销/清理 push client 时同步维护两个映射。

### 修改文件清单

| 文件 | 变更 |
|------|------|
| `internal/engine/pinyin/engine_ex.go` | 复用 SyllableTrie + 预分配 map |
| `internal/coordinator/coordinator.go` | 缓存热键 + 焦点变化后异步 GC |
| `cmd/service/main.go` | SetMemoryLimit + SetGCPercent |
| `internal/bridge/server.go` | 快速命令同步执行 + 反向 PID 映射 |
| `internal/engine/pinyin/lattice.go` | 预分配 seen map + 优化 latticeKey |

### 效果

- 拼音按键触发的临时分配显著减少（最大热点 SyllableTrie 重建被消除）
- 焦点切换不再触发热键重编译，配合 GOGC=50 和异步 FreeOSMemory，内存波动明显减小
- 快速命令响应路径更短（无 goroutine/channel 开销）

---

## 设计原则总结

1. **数据不入堆**：大规模只读数据（词库、语言模型）通过 mmap 映射到虚拟内存，不进入 Go 堆，消除 GC 压力
2. **复用优先于创建**：SyllableTrie 引擎级复用，热键编译结果缓存，避免重复计算
3. **预分配容量**：对已知大小范围的 map/slice 预分配容量，减少运行时扩容
4. **异步回收**：焦点变化等非性能敏感路径异步触发 GC + FreeOSMemory，主动归还内存
5. **分类处理**：区分快速命令和耗时命令，避免对快速操作使用重量级的并发机制
6. **接口抽象**：UnigramLookup 接口让内存/mmap 两种模式无缝切换，不影响上层逻辑
