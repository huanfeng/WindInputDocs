# 安装指南

## 系统要求

- Windows 10 或 Windows 11（64 位）
- 安装版需要管理员权限

## 方式一：安装包（推荐）

1. 从 [GitHub Releases](https://github.com/huanfeng/WindInput/releases) 下载最新的安装包 `WindInput-x.x.x-Setup.exe`
2. 双击运行安装程序
3. 按照提示完成安装
4. 安装完成后，按 `Win + Space` 切换到清风输入法

安装程序会自动完成以下操作：
- 将程序文件安装到 `Program Files\WindInput\`
- 注册 TSF 输入法组件
- 创建卸载入口

## 方式二：便携版

适合 U 盘携带或不想安装到系统的用户。

1. 从 [GitHub Releases](https://github.com/huanfeng/WindInput/releases) 下载 `WindInput-x.x.x-Portable.zip`
2. 解压到任意目录
3. 运行 `wind_portable.exe` 即可使用

::: tip 便携版特点
- 所有数据保存在程序所在目录，不写入注册表或 AppData
- 更新时下载新版 ZIP 覆盖解压即可
- 关闭 `wind_portable.exe` 后自动卸载输入法组件
:::

## 卸载

### 安装版卸载

1. 打开 **Windows 设置** → **应用** → **已安装的应用**
2. 搜索"清风输入法"，点击卸载
3. 或运行安装目录下的卸载工具

### 便携版卸载

关闭 `wind_portable.exe` 即可，删除解压目录即完成清理。

## 已知问题

### Windows SmartScreen 拦截

由于当前版本没有数字签名，安装时可能触发 Windows SmartScreen 拦截提示。这是正常现象，点击 **"更多信息"** → **"仍要运行"** 即可继续安装。

### 杀毒软件报毒

清风输入法需要注册系统输入法组件，部分安全软件可能会拦截。请在安全软件中允许相关操作，或暂时关闭杀毒软件完成安装。

### 开始菜单候选框限制

由于缺少数字签名，候选窗口无法显示在开始菜单之上。目前已通过宿主进程代理渲染进行优化，但在开始菜单中候选框暂不支持鼠标操作。

## 安装后配置

安装完成后，推荐进行以下配置：

1. 使用 `Ctrl + Shift + E` 选择你偏好的[输入方案](/schema/)
2. 通过 `Ctrl + Shift + ]` 打开设置工具，调整个性化选项
3. 阅读[基础使用](/guide/basics)了解日常操作
