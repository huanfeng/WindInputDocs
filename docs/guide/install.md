# 安装指南

## 系统要求

- Windows 10 或 Windows 11（64 位）
- macOS 12 及以上（Apple Silicon / Intel，**alpha**）

::: tip 选择你的平台
Windows 用户请看下方「方式一 / 方式二」；macOS 用户请直接跳到 [macOS 安装](#macos-install)。
:::

## 方式一：安装包（推荐）

1. 从 [GitHub Releases](https://github.com/huanfeng/WindInput/releases) 下载最新的安装包 `WindInput-x.x.x-Setup.exe`
2. 双击运行安装程序，按照提示完成安装
3. 安装完成后，按 `Win + Space` 切换到清风输入法

安装程序会自动完成以下操作：
- 将程序文件安装到 `C:\Program Files\WindInput\`
- 注册 TSF 输入法组件
- 创建开始菜单快捷方式和卸载入口

::: tip 自定义路径
安装时支持自定义安装路径和用户数据目录。\
用户数据目录默认位于 `%APPDATA%\WindInput`，用于存放词库、配置等个人数据。
:::

::: warning 不要在程序目录存放个人文件
**安装版在更新版本时，会先卸载旧版本再安装新版本**，安装目录（默认 `C:\Program Files\WindInput\`）下的所有文件都会被清理后重新写入。\
请勿将自定义配置、第三方词库、自定义主题等直接放入安装目录或其中的 `data\` 子目录 —— 这些文件会在升级时丢失，对内置文件的修改也会被覆盖。\
所有个人化内容请放入下文介绍的**用户数据目录**，更新时不会被清理。
:::

## 方式二：便携版

适合 U 盘携带或不想安装到系统的用户。

1. 从 [GitHub Releases](https://github.com/huanfeng/WindInput/releases) 下载 `WindInput-x.x.x-Portable.zip`
2. 解压到任意目录
3. 运行便携版启动器 `wind_portable.exe`，启动器会自动注册输入法组件和开机启动项，以保证输入法的正常运行

::: tip 便携版说明
- 用户数据固定保存在程序目录下的 `userdata` 目录中，不支持修改
- 关闭 `wind_portable.exe` 时会提示是否进行卸载
- 更新时由于 DLL 锁定问题，建议使用便携版启动器的 **部署 → 更新** 功能进行更新
:::

## macOS 安装 {#macos-install}

::: warning alpha 阶段
macOS 版处于 alpha：未做苹果公证，功能与 Windows 版存在差异，建议有一定动手能力的用户尝试。
:::

1. 从 [GitHub Releases](https://github.com/huanfeng/WindInput/releases) 下载 `WindInput-x.x.x-macOS.pkg`
2. 双击运行安装。这是一个 **universal** 安装包（同时支持 Apple Silicon 与 Intel），内含**输入法、后台服务、设置程序**三件套
3. 打开 **系统设置 → 键盘 → 文本输入 → 输入法 → 编辑**，添加并切换到「清风输入法」（也可用 `⌃Space` 或菜单栏输入菜单切换）

安装后：

- 设置程序位于 `~/Applications/清风输入法设置.app`，也可从输入法菜单的「设置…」打开
- 后台服务随登录自动启动；用户数据与日志路径见下文 [用户数据目录](#用户数据目录)

::: warning 未公证 / Gatekeeper
当前版本未做苹果公证。首次安装或启用时，可能需要在 **系统设置 → 隐私与安全性** 中点「仍要打开」放行；新系统 **macOS 26 (Tahoe)** 对未公证输入法限制更强。
:::

::: tip 重新安装请先重启
卸载后若要重装，建议先**注销或重启**，让系统清除输入法注册缓存，避免出现「设置里已添加、切换列表却没有」的情况。
:::

### macOS 卸载

双击 `~/Applications/卸载清风输入法.app`，按提示完成。用户词库 / 配置默认保留在 `~/Library/Application Support/WindInput/`，不会被删除。

## 用户数据目录

::: tip macOS 路径对照
本站文档中的路径多以 Windows 的 `%APPDATA%\WindInput\` 书写。macOS 上的对应位置为：

| 用途 | Windows | macOS |
|------|---------|-------|
| 用户数据目录 | `%APPDATA%\WindInput\` | `~/Library/Application Support/WindInput/` |
| 日志 | 安装目录 / `userdata` | `~/Library/Logs/WindInput/` |
| 设置程序 | 开始菜单 / 安装目录 | `~/Applications/清风输入法设置.app` |

macOS 用户数据目录的**子目录结构与 Windows 完全一致**，下文以 Windows 路径为例的说明同样适用，只需替换为上表对应路径。
:::

清风输入法采用**双目录 + 同结构覆盖**的存储设计：

| 目录 | 角色 | 升级行为 |
|------|------|----------|
| `<安装目录>\data\`（安装版）<br>`<解压目录>\data\`（便携版） | 程序自带的**系统预置数据**，只读 | 升级时随安装包整体替换 |
| `%APPDATA%\WindInput\`（安装版，可在安装时自定义）<br>`<解压目录>\userdata\`（便携版） | **用户数据目录**，存放个人化内容 | 升级时不会主动清理，仅卸载时手动选择"删除用户数据"才会删除 |

::: tip 覆盖机制
用户数据目录与程序 `data\` 目录采用**相同的子目录结构**。当两侧存在同名文件时，**用户数据目录中的文件优先生效**（系统短语等个别采用合并策略的文件除外）。\
这意味着你可以在用户数据目录下放置同名文件来覆盖内置版本，而不需要修改程序目录里的任何文件。
:::

### 用户数据目录结构

以默认路径 `%APPDATA%\WindInput\` 为例：

```text
%APPDATA%\WindInput\
├── config.yaml                       # 用户全局配置（diff 保存，仅含与默认值不同的字段）
├── compat.yaml                       # 用户自定义的应用兼容性规则
├── state.yaml                        # 运行状态（如固定候选位置坐标）
├── system.phrases.yaml               # 覆盖内置系统短语种子（可选，一般不需要）
├── schemas\                          # 输入方案与方案级词库
│   ├── pinyin.schema.yaml            # 方案配置（覆盖或新增）
│   ├── wubi86.schema.yaml
│   ├── my_schema.schema.yaml         # 自定义新方案
│   ├── my_schema.phrases.yaml        # 方案专属短语
│   └── <第三方词库文件>               # 方案引用的词库放在同目录
└── themes\                           # 自定义主题
    ├── default\theme.yaml            # 覆盖内置主题（可选）
    └── <自定义主题名>\theme.yaml      # 新增第三方主题
```

### 放置规则速查

| 需求 | 放到哪里 |
|------|----------|
| 调整全局配置 | 通过设置工具修改，或编辑 `config.yaml` |
| 新增第三方输入方案 | `schemas\<方案ID>.schema.yaml`，并在 `config.yaml` 的 `schema.available` 中登记 |
| 替换/扩充内置方案的词库 | 在 `schemas\` 下放置对应词库文件，方案文件中通过 `dictionaries` 引用 |
| 新增自定义主题 | `themes\<主题名>\theme.yaml`，在设置工具"外观"页面选用 |
| 微调内置主题 | 在 `themes\` 下创建**同名**目录与 `theme.yaml`，自动覆盖内置版本 |
| 自定义短语 | 通过 **设置 → 词库 → 短语** 添加（写入 `user_data.db`），不要直接编辑 `system.phrases.yaml` |
| 应用兼容性规则 | 通过右键菜单有一部分可配置，或编辑 `compat.yaml` |

::: tip 备份与迁移
用户数据目录是完整自包含的——只需备份该目录即可保存所有个人化内容。换机或重装时复制回去即可恢复，不依赖任何注册表项。也可以在 **设置 → 词库 → 完整备份/恢复** 中导出 ZIP 包。
:::

## 卸载

### 安装版卸载

通过以下任一方式卸载：
- 打开 **Windows 设置** → **应用** → **已安装的应用**，搜索"清风输入法"，点击卸载
- 通过 **开始菜单** 中的卸载入口
- 运行安装目录下的卸载工具

::: warning 注意
卸载时会提示是否删除用户数据，删除后词库、配置等数据将无法恢复，请谨慎选择。
:::

### 便携版卸载

关闭 `wind_portable.exe` 时选择卸载即可，之后删除解压目录完成清理。

## 已知问题

### Windows SmartScreen 拦截

由于当前版本没有数字签名，安装时可能触发 Windows SmartScreen 拦截提示。这是正常现象，点击 **"更多信息"** → **"仍要运行"** 即可继续安装。

### 杀毒软件报毒

清风输入法需要注册系统输入法组件，部分安全软件可能会拦截。请在安全软件中允许相关操作，或暂时关闭杀毒软件完成安装。

### 开始菜单候选框限制

由于缺少数字签名，候选窗口无法显示在开始菜单之上。目前已通过宿主进程代理渲染进行优化，但在开始菜单中候选框暂不支持鼠标操作。

### 部分游戏中无法使用

由于缺少数字签名，一些网络游戏不会加载未签名的输入法 DLL，导致输入法无法在游戏中启用。

### macOS：未公证与系统限制

macOS 版未做苹果公证：首次安装 / 启用可能需要在「系统设置 → 隐私与安全性」中放行；**macOS 26 (Tahoe)** 对未公证输入法限制更强，可能无法正常注册到输入法列表。后续提供签名 / 公证版本后将改善。此外，macOS 版与 Windows 版在部分功能上存在差异（详见[设置说明](/settings/general)）。

## 安装后配置

安装完成后，推荐进行以下配置：

1. 使用 `Ctrl + Shift + E` 选择你偏好的[输入方案](/schema/)
2. 通过 `Ctrl + Shift + ]` 打开设置工具，调整个性化选项
3. 阅读[基础使用](/guide/basics)了解日常操作

::: tip macOS 快捷键
以上快捷键默认值在 macOS 上同样适用；macOS 额外支持 `⌘`(Command) / `⌥`(Option) 作为修饰键。切换到 / 离开清风输入法使用系统的 `⌃Space`，而非 Windows 的 `Win + Space`。
:::

::: tip 提示
以上快捷键均为默认值，可在设置工具中自行修改。
:::
