# 清风输入法文档站

清风输入法（[WindInput](https://github.com/huanfeng/WindInput)）的用户文档，
基于 [fumadocs](https://fumadocs.dev)（Next.js 静态导出）。

> 本仓取代旧文档站 WindInputDocs（VitePress）。内容按新信息架构重写，
> 事实基线沿用旧站 2026-07 逐页查证的成果。

## 开发

```bash
pnpm install
pnpm dev          # 开发服务器 http://localhost:3000
pnpm build        # 静态导出到 out/
pnpm types:check  # 类型检查
pnpm lint         # biome 检查
```

## 结构

| 位置 | 内容 |
| --- | --- |
| `content/docs/` | 全部文档页（MDX），`meta.json` 控制侧栏分组与顺序 |
| `src/lib/shared.ts` | 站名、仓库地址等站点常量 |
| `src/lib/releases.ts` | 版本号与更新记录数据（下载页/更新记录页数据源，暂手工维护） |
| `src/lib/translations.ts` | fumadocs-ui 界面文案汉化表 |
| `src/components/search.tsx` | 静态搜索客户端（Orama + mandarin tokenizer） |
| `src/app/api/search/route.ts` | 构建期导出搜索索引（与客户端同款中文分词，两处必须一致） |

## 内容章节

- `start/` 快速开始（安装 / 第一次输入 / 核心概念）
- `input/` 输入功能（拼音 / 五笔 / 混输 / 标点 / 快捷输入 / 临时模式）
- `customize/` 个性化（设置 / 快捷键 / 外观 / 词库 / 短语 / 方案）
- `advanced/` 进阶（命令直通车 / 配置文件 / 备份还原）
- `reference/` 参考（快捷键总表 / FAQ）

## 待接入

- [ ] 部署链路（Cloudflare Pages，静态产物在 `out/`）
- [ ] 版本号自动同步（`src/lib/releases.ts` 暂手工维护，待对齐主仓 `docs/VERSION` 发布链路）
- [ ] 更新记录由发布流程自动追加（页面已建在 `/changelog`，数据源同上）

> 注：OG 图路由（`src/app/og/`）渲染中文标题时会从 Google Fonts 动态拉字形，
> 国内网络下构建会每页超时 ~10s 后降级（构建仍成功、OG 图中文缺字）。
> 海外 CI 构建不受影响；若需本地构建加速可设代理，或后续换本地字体文件。
