# GitHub Pages 自动部署配置

## 概述

清风输入法文档使用 GitHub Pages 自动部署，每次推送到 main 或 docs 分支时，会自动构建并部署文档到 GitHub Pages。

## 配置步骤

### 1. 启用 GitHub Pages

1. 进入 GitHub 仓库设置：
   - 访问 https://github.com/huanfeng/wind_input/settings/pages
   - 或者从仓库首页点击 "Settings" → "Pages"

2. 在 "Source" 部分：
   - 选择 "GitHub Actions"
   - 不要选择 "Deploy from a branch"，因为我们使用 Actions 部署

3. 点击 "Save"

### 2. 查看部署状态

1. 访问仓库的 "Actions" 标签页
2. 点击 "Deploy Documentation" 工作流
3. 可以查看构建日志和部署状态

## 工作流说明

### 触发条件

- **自动触发**：
  - 推送到 main 分支
  - 推送到 docs 分支
  - 针对 main 分支的 PR（用于测试）

- **手动触发**：
  - 在 Actions 页面点击 "Run workflow"

### 构建步骤

1. **检出代码** - 获取最新代码
2. **设置环境** - 安装 pnpm 和 Node.js
3. **安装依赖** - 在 docs 目录安装依赖
4. **构建文档** - 使用 VitePress 构建
5. **部署** - 上传到 GitHub Pages

### 部署地址

文档部署后可以通过以下地址访问：
- https://huanfeng.github.io/WindInput/

## 故障排除

### 构建失败

1. 查看 Actions 日志，查找错误信息
2. 常见问题：
   - Node.js 版本不匹配：确保使用 Node 20
   - 依赖安装失败：检查 pnpm-lock.yaml
   - 构建错误：检查文档语法

### 权限问题

如果遇到权限错误，确保：
1. 仓库已启用 GitHub Pages
2. Actions 有足够的权限（通常自动设置）

### 自定义域名（可选）

如果需要使用自定义域名：

1. 在仓库设置 → Pages 中添加自定义域名
2. 在 docs/.vitepress/config.ts 中配置：
   ```typescript
   head: [
     ['link', { rel: 'icon', href: '/logo.svg' }],
     ['meta', { name: 'description', content: '...' }]
   ],
   ```
3. 确保 CNAME 文件在 public 目录（如果需要）

## 最佳实践

1. **分支管理**：
   - main 分支用于生产部署
   - docs 分支用于开发测试

2. **文档更新**：
   - 提交前本地测试：`pnpm build`
   - 大改动时先在 docs 分支测试

3. **版本控制**：
   - 文档变更随代码一起提交
   - 使用有意义的提交信息

## 本地测试

在本地测试文档构建：

```bash
# 进入 docs 目录
cd docs

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

访问 http://localhost:5173 查看效果。