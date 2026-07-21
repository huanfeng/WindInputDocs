# 清风输入法文档站

清风输入法（[WindInputPlus](https://github.com/huanfeng/WindInputPlus)）的用户文档，
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
- [ ] 版本号数据源（下载页动态版本，对齐主仓 `docs/VERSION` 发布链路）
- [ ] changelog 页面（由发布流程生成）
