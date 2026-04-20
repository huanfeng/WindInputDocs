# 清风输入法文档

## 📖 简介

清风输入法文档项目的官方文档仓库，基于 [VitePress](https://vitepress.dev/) 构建。

本项目为独立文档仓库，与主代码仓库 [WindInput](https://github.com/huanfeng/wind_input) 分离，便于文档的独立维护和社区贡献。

## 🚀 在线文档

访问 https://huanfeng.github.io/WindInputDocs/ 查看在线文档。

## 🛠️ 本地开发

### 环境要求

- Node.js 20+
- pnpm 8+

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/huanfeng/WindInputDocs.git
cd WindInputDocs

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:5173 查看效果。

### 构建和预览

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

### 代码格式化

```bash
# 格式化所有文件
pnpm format
```

## 📁 项目结构

```
WindInputDocs/
├── docs/                      # VitePress 源文件
│   ├── .vitepress/           # VitePress 配置
│   ├── guide/                # 使用指南
│   ├── reference/            # 参考资料
│   ├── hotkeys/              # 快捷键
│   ├── config/               # 配置说明
│   ├── faq/                  # 常见问题
│   └── index.md              # 首页
├── .github/workflows/        # GitHub Actions 配置
├── package.json              # 项目配置
└── README.md                 # 项目说明
```

## 🔧 自动部署

文档已配置 GitHub Actions 自动部署：
- 推送到 `main` 分支时自动构建和部署
- 部署到 GitHub Pages
- 访问地址：https://huanfeng.github.io/WindInputDocs/

### GitHub Pages 设置

首次使用需要：
1. 进入仓库 Settings → Pages
2. 选择 "GitHub Actions" 作为 Source
3. 保存设置

详见 [GitHub Pages 部署指南](docs/guide/github-pages-setup.md)

## 🤝 贡献指南

欢迎贡献文档！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 文档规范

- 使用清晰的标题和段落结构
- 适当使用代码块和表格
- 提供实际的示例和截图
- 保持语言简洁易懂

## 📝 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 🔗 相关链接

- 主代码仓库：https://github.com/huanfeng/wind_input
- 在线文档：https://huanfeng.github.io/WindInputDocs/
- 问题反馈：https://github.com/huanfeng/WindInputDocs/issues

## 📧 联系方式

如有问题或建议，欢迎通过以下方式联系：

- GitHub Issues: https://github.com/huanfeng/WindInputDocs/issues
- Email: huanfeng@example.com

---

**注意**：本仓库仅包含文档内容，如需参与输入法代码开发，请访问主代码仓库 [WindInput](https://github.com/huanfeng/wind_input)。
