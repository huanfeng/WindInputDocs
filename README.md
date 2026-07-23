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
| `data/releases.json` | 版本号与更新记录数据（**自动同步，勿手工修改**） |
| `src/lib/releases.ts` | 上述数据的类型定义与派生量（`currentVersion`、下载直链） |
| `src/lib/translations.ts` | fumadocs-ui 界面文案汉化表 |
| `src/components/search.tsx` | 静态搜索客户端（Orama + mandarin tokenizer） |
| `src/app/api/search/route.ts` | 构建期导出搜索索引（与客户端同款中文分词，两处必须一致） |

## 内容章节

- `start/` 快速开始（安装 / 第一次输入 / 核心概念）
- `input/` 输入功能（拼音 / 五笔 / 混输 / 标点 / 快捷输入 / 临时模式）
- `customize/` 个性化（设置 / 快捷键 / 外观 / 词库 / 短语 / 方案）
- `advanced/` 进阶（命令直通车 / 配置文件 / 备份还原）
- `reference/` 参考（快捷键总表 / FAQ）

## 部署与自动化

站点由 **Cloudflare Pages**（项目 `windinput-docs`）直接从 `main` 分支构建部署到
https://windinput.com 。GitHub Actions 只做校验，不负责发布。

| 触发 | 动作 |
| --- | --- |
| Push / PR 到 `main` | `.github/workflows/docs.yml`：lint + 类型检查 + 构建校验；Cloudflare Pages 独立构建并部署（PR 有 preview） |
| 主仓发布 Release（`repository_dispatch: changelog-updated`） | `.github/workflows/sync-changelog.yml`：提取 Release body 的 user-facing 段落 → 写入 `data/releases.json` → 开 PR 并自动合并 |
| 每天 04:00 CST | 同上工作流的定时兜底，防跨仓 dispatch 事件丢失 |

`data/releases.json` 是版本相关信息的**唯一数据源**：更新记录页逐条渲染它，
下载页的直链版本号取它的首项。同步脚本是 `scripts/sync_release_notes.py`。

### Cloudflare Pages 构建设置

| 项 | 值 |
| --- | --- |
| Build command | `pnpm build` |
| Build output directory | `out` |
| Root directory | `/` |
| Node 版本 | 由 `.node-version` 指定（22） |
| pnpm 版本 | 由 `package.json` 的 `packageManager` 指定 |

> `pnpm-workspace.yaml` 的 `allowBuilds` 字段需要 pnpm 10+ 才生效，
> Pages 项目的 build image 需为 v3。

> 下载直链走 Cloudflare R2（`https://dl.windinput.com/WindInput-<版本>-Setup.exe`，
> 与旧站一致）；GitHub Releases 仅作备用渠道（国内访问较慢）。
> 便携版不单独发包，由安装包的便携解压模式释放；macOS 版开发中、未发布。

> 注：OG 图路由（`src/app/og/`）渲染中文标题时会从 Google Fonts 动态拉字形，
> 国内网络下构建会每页超时 ~10s 后降级（构建仍成功、OG 图中文缺字）。
> 海外 CI 构建不受影响；若需本地构建加速可设代理，或后续换本地字体文件。
