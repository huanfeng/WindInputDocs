<!-- Generated: 2026-06-12 -->

# WindInputDocs — 清风输入法文档站

## 仓库定位

本仓库是 **清风输入法（WindInput）** 的独立文档网站，使用 **VitePress 1.3+** 构建。
与主代码仓库（`WindInput`）分离，仅维护面向用户的使用文档。

- **在线地址**: https://huanfeng.github.io/WindInput/
- **主题编辑器**: https://theme.windinput.com
- **主题市场**: https://market.windinput.com
- **代码仓库**: https://github.com/huanfeng/WindInput（非本仓库）

## 目录结构

```
WindInputDocs/
├── docs/                          ← VitePress 文档源（内容主体）
│   ├── .vitepress/
│   │   ├── config.ts              ← ★ 导航栏、侧边栏、站点配置（新页面必须在此注册）
│   │   └── theme/                 ← 主题定制（通常不需修改）
│   │       ├── index.ts
│   │       └── style.css
│   ├── index.md                   ← 首页（Hero + Features 布局）
│   ├── guide/                     ← 快速入门
│   │   ├── install.md             ← 安装指南（Windows / macOS）
│   │   └── basics.md              ← 基础使用
│   ├── settings/                  ← 设置界面操作说明（UI 截图配套）
│   │   ├── general.md             ← 方案设置
│   │   ├── input.md               ← 输入设置
│   │   ├── hotkeys.md             ← 按键设置
│   │   ├── appearance.md          ← 外观设置
│   │   ├── dictionary.md          ← 词库设置
│   │   ├── advanced.md            ← 高级设置
│   │   └── stats.md               ← 统计功能
│   ├── config/                    ← 配置文件参考（技术性，面向高级用户）
│   │   ├── index.md               ← 配置机制与全局配置
│   │   ├── schema.md              ← 方案配置详解（YAML Schema 字段）
│   │   └── compat-theme.md        ← 兼容主题配置
│   ├── schema/                    ← 输入方案专题
│   │   ├── index.md               ← 方案介绍与切换
│   │   └── custom.md              ← 自定义方案制作
│   ├── topics/                    ← 进阶专题（深入机制说明）
│   │   ├── index.md               ← 专题索引
│   │   ├── weight-system.md       ← 权重与候选词排序机制
│   │   ├── command-bar.md         ← 命令直通车
│   │   └── special-mode.md        ← 引导键特殊模式
│   ├── hotkeys/
│   │   └── index.md               ← 完整快捷键参考表
│   ├── faq/
│   │   └── index.md               ← 常见问题
│   ├── changelog/
│   │   └── index.md               ← 版本更新日志（由 CI 自动同步，勿手动大改）
│   ├── download/
│   │   ├── index.md               ← 下载页面
│   │   └── version.data.ts        ← 动态版本数据（VitePress data loader）
│   └── public/
│       └── logo.png               ← 站点 Logo
├── scripts/
│   └── sync_release_notes.py      ← CI 自动同步 Release Notes 到 changelog/
├── .github/workflows/
│   ├── docs.yml                   ← 构建验证 + 触发主仓库发布
│   └── sync-changelog.yml         ← 接收 changelog-updated 事件，自动创建 PR
├── docs-structure.md              ← 文档架构设计规划（参考文档，非实际文件）
├── package.json                   ← 根脚本：dev / build / preview / format
└── CLAUDE.md                      ← AI 开发规范
```

## 内容地图：该在哪里添加

| 需要添加的内容         | 目标目录/文件             | 是否需要更新 config.ts        |
| ---------------------- | ------------------------- | ----------------------------- |
| 新安装说明（如 Linux） | `docs/guide/` 新建文件    | ✅ 需要，加入 `guide` 侧边栏  |
| 新设置项说明           | `docs/settings/` 对应文件 | 通常不需要（已有页面追加）    |
| 新配置字段文档         | `docs/config/schema.md`   | 不需要                        |
| 新输入方案专题         | `docs/topics/` 新建文件   | ✅ 需要，加入 `topics` 侧边栏 |
| 新进阶专题             | `docs/topics/` 新建文件   | ✅ 需要，加入 `topics` 侧边栏 |
| 快捷键变更             | `docs/hotkeys/index.md`   | 不需要                        |
| FAQ 条目               | `docs/faq/index.md`       | 不需要                        |
| 版本日志               | `docs/changelog/index.md` | 不需要（CI 自动处理）         |

## 关键配置文件：`docs/.vitepress/config.ts`

**新建页面后必须在此文件注册**，否则页面存在但不会出现在导航中。

### 侧边栏结构（sidebar）

```
/guide/    → guide 侧边栏
/settings/ → settings 侧边栏
/config/   → config 侧边栏
/schema/   → schema 侧边栏
/topics/   → topics 侧边栏
/hotkeys/  → 单页，无侧边栏
/faq/      → 单页，无侧边栏
```

### 添加新页面的操作步骤

1. 在对应目录创建 `.md` 文件
2. 在 `config.ts` 找到对应的 `sidebar` 条目，追加：
   ```ts
   { text: '页面标题', link: '/目录/文件名' }
   ```
3. 如需导航栏入口，在 `nav` 数组追加条目
4. 运行 `pnpm build` 验证无构建错误

## 开发命令

```bash
# 在项目根目录运行
pnpm dev        # 启动开发服务器（http://localhost:5173）
pnpm build      # 生产构建（输出到 docs/.vitepress/dist/）
pnpm preview    # 预览构建结果
pnpm format     # 格式化所有 .md / .json / .ts 文件（使用 Prettier）
```

## 文档写作规范

### 文件命名

- 全小写 + 连字符：`weight-system.md`、`compat-theme.md`
- 每个目录的入口文件统一命名为 `index.md`

### Markdown 规范

- 语言：**简体中文**
- 一级标题（`#`）即为页面标题，与 `config.ts` 中的 `text` 保持一致
- 代码块标注语言类型：` ```toml `、` ```yaml `、` ```bash `
- 配置项示例优先使用 **TOML v1** 格式（项目已从 YAML 迁移到 TOML）
- 图片放在 `docs/public/` 或与 `.md` 同目录，使用相对路径引用

### 不要修改

- `docs/changelog/index.md`：由 CI 自动生成，手动改动会被覆盖
- `docs/download/version.data.ts`：动态数据加载器，不含文档内容
- `docs/.vitepress/dist/`：构建产物，已在 `.gitignore` 中

## 自动化流程（仅供参考，无需手动操作）

| 触发条件                      | 动作                                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| Push 到 `main`                | CI 构建验证 → 触发主仓库 `repository_dispatch` → 发布到 GitHub Pages |
| 收到 `changelog-updated` 事件 | 自动拉取最新 Release Notes → 更新 `changelog/index.md` → 创建 PR     |

## For AI Agents

- **修改文档后**：运行 `pnpm format` 格式化，再运行 `pnpm build` 验证构建
- **新增页面后**：必须同步更新 `docs/.vitepress/config.ts` 中的侧边栏
- **不要主动** `git commit` 或 `git push`
- **配置格式**：文档中的配置示例统一使用 TOML v1 格式
- **日志/敏感信息**：本仓库为纯文档，不涉及运行时日志规范
