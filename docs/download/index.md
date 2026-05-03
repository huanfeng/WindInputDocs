<script setup>
import { data } from './version.data'

const proxy1 = data.downloadUrl ? `https://ghproxy.net/${data.downloadUrl}` : null
const proxy2 = data.downloadUrl ? `https://ghfast.top/${data.downloadUrl}` : null
</script>

# 下载

## 最新版本

<template v-if="data.version">

当前最新版本：**v{{ data.version }}**

| 下载方式 | 链接 |
| --- | --- |
| GitHub 直链 | <a :href="data.downloadUrl">WindInput-{{ data.version }}-Setup.exe</a> |
| 国内加速 1 | <a :href="proxy1">ghproxy.net 代理下载</a> |
| 国内加速 2 | <a :href="proxy2">ghfast.top 代理下载</a> |

> 代理服务为第三方提供，可用性随时可能变化，如某个链接无法访问请尝试其他链接。

前往 [GitHub Releases](https://github.com/huanfeng/WindInput/releases) 查看所有历史版本及更新说明。

</template>
<template v-else>

前往 [GitHub Releases](https://github.com/huanfeng/WindInput/releases) 下载最新版本。

</template>

---

## 自定义码表方案

清风输入法支持通过码表方案文件扩展输入方案（五笔 98、新世纪、虎码等）。  
社区维护的码表方案仓库：

**[WindInputCodeTable](https://github.com/huanfeng/WindInputCodeTable)**

可在该仓库中下载或贡献更多码表方案。
