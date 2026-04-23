# GitHub Pages 发布链路

## 概述

清风输入法文档采用双仓库发布链路：

- `WindInputDocs` 负责文档源码维护与构建验证
- `WindInput` 负责接收通知、拉取文档源码并发布到 GitHub Pages

## 配置步骤

### 1. 启用 GitHub Pages

1. 进入主代码仓库设置：
   - 访问 https://github.com/huanfeng/WindInput/settings/pages
   - 或者从 `WindInput` 仓库首页点击 "Settings" → "Pages"

2. 在 "Source" 部分：
   - 选择 "GitHub Actions"
   - 不要选择 "Deploy from a branch"，因为我们使用 Actions artifact 部署

3. 点击 "Save"

### 2. 查看部署状态

1. 访问仓库的 "Actions" 标签页
2. 点击 `Build and Deploy Docs Site` 工作流
3. 可以查看构建日志和部署状态

## 工作流说明

### 触发条件

- **WindInputDocs 自动触发**：
  - 推送到 `main` 分支时构建校验
  - 针对 `main` 分支的 PR 时构建校验
  - `main` 校验成功后向 `WindInput` 发送 `repository_dispatch`

- **WindInput 自动触发**：
  - 收到 `docs-updated` 事件后拉取对应提交并发布
  - 在 Actions 页面手动触发以便重建站点

### 构建步骤

1. **WindInputDocs 检出代码并构建** - 验证文档可正常生成
2. **通知 WindInput** - 发送源提交 SHA
3. **WindInput 拉取对应提交** - 使用该 SHA 重建文档
4. **上传 Pages artifact** - 产出静态站点文件
5. **部署** - 发布到 `WindInput` 的 GitHub Pages

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
1. `WindInput` 仓库已启用 GitHub Pages
2. `WindInputDocs` 仓库已配置 `WINDINPUT_REPO_DISPATCH_TOKEN`
3. 该 token 对 `huanfeng/WindInput` 拥有触发 `repository_dispatch` 所需权限

### 自定义域名（可选）

如果需要使用自定义域名：

1. 在仓库设置 → Pages 中添加自定义域名
2. 在 docs/.vitepress/config.ts 中配置：
   ```typescript
   const base = process.env.WINDINPUT_DOCS_BASE || '/WindInput/'

   head: [
     ['link', { rel: 'icon', href: `${base}logo.png` }],
     ['meta', { name: 'description', content: '...' }]
   ],
   ```
3. 确保 CNAME 文件在 public 目录（如果需要）

## 最佳实践

1. **职责分离**：
   - `WindInputDocs/main` 负责文档内容演进
   - `WindInput` 负责最终发布

2. **文档更新**：
   - 提交前本地测试：`pnpm build`
   - 如需检查发布效果，可在 `WindInput` 手动触发部署工作流

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
