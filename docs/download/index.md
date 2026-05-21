<script setup>
import { data } from './version.data'
</script>

# 下载

## 最新版本

<template v-if="data.version">

当前最新版本：**v{{ data.version }}**

| 下载方式                  | 链接                                                                     | 备注                           |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| Cloudflare R2（国内推荐） | <a :href="data.r2DownloadUrl">WindInput-{{ data.version }}-Setup.exe</a> | 全球 CDN，国内访问稳定         |
| GitHub Release（海外）    | <a :href="data.githubUrl">WindInput-{{ data.version }}-Setup.exe</a>     | 可在 GitHub 上查看更新说明原文 |

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
