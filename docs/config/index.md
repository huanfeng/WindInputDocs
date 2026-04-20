# 配置

## 配置文件位置

清风输入法配置文件位于：

```
%APPDATA%\WindInput\config.yaml
```

## 配置结构

```yaml
startup:
  default_chinese_mode: true  # 启动默认中文模式

schema:
  active: pinyin              # 当前方案
  available: [pinyin, wubi86] # 可用方案列表

ui:
  font_size: 16               # 候选词字体大小
  candidates_per_page: 9      # 每页候选词数量
  theme: default              # 主题

hotkeys:
  toggle_mode_keys: [lshift]  # 中英文切换键
```

## 方案配置

每个输入方案有独立的配置文件，位于：

```
%APPDATA%\WindInput\schemas\
```

### 拼音方案

位于 `pinyin.schema.yaml`

### 五笔方案

位于 `wubi86.schema.yaml`

### 混输方案

位于 `wubi86_pinyin.schema.yaml`

## 使用设置工具

运行设置工具可以图形化修改配置，修改后即时生效。
