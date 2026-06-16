# 🧰 DSShed — Digital Storage Shed

**我的个人工具箱与文档库** — 随时随地访问下载需要的工具和文档。

🌐 **访问地址：** [https://chengdusen.github.io/](https://chengdusen.github.io/)

---

## ✨ 功能特性

- 🎨 **暗色主题** — 紫绿渐变配色，高端大气
- 📦 **卡片式布局** — 清晰展示每个工具的信息
- 🔍 **快速搜索** — 支持 `Ctrl+K` 快捷键，实时高亮匹配
- 📂 **分类筛选** — 按类别浏览工具和文档
- 📱 **响应式设计** — 电脑/平板/手机完美适配
- ⚡ **纯静态站点** — 基于 GitHub Pages，加载飞快

## 🗂 项目结构

```
DSShed/
├── index.html                 # 主页面
├── admin.html                 # 在线管理面板
├── admin-local.html           # 本地管理工具
├── 404.html                   # 404 页面
├── css/
│   ├── style.css              # 主样式
│   └── admin.css              # 管理面板样式
├── js/
│   ├── app.js                 # 主逻辑
│   └── admin.js               # 管理面板逻辑
├── data/
│   └── data.json              # 数据文件
├── files/                     # 文件存储目录
└── .github/
    └── workflows/
        └── deploy.yml         # 自动部署
```

## 🚀 快速开始

### 本地预览

直接在浏览器中打开 `index.html`，或使用任意静态服务器：

```bash
# 使用 Python
python -m http.server 8080

# 使用 Node.js
npx serve .
```

### 添加内容

#### 方式一：本地管理工具（推荐）

1. 在浏览器打开 `admin-local.html`
2. 点击「加载 data.json」导入数据
3. 添加/编辑工具项和分类
4. 点击「导出 data.json」下载
5. 将文件放入 `data/` 目录并提交

#### 方式二：在线管理面板

1. 访问 `https://chengdusen.github.io/admin.html`
2. 输入 GitHub Token 和密码登录
3. 直接通过 GitHub API 管理内容

#### 方式三：手动编辑

直接编辑 `data/data.json`，将文件放入 `files/` 目录。

## 📦 大文件处理

大于 50MB 的文件建议使用 **GitHub Releases**：

1. 在仓库页面点击 Releases → Create a new release
2. 填写版本号，上传大文件作为附件
3. 发布后，将附件链接填入工具项的下载链接
4. 存储方式选择「GitHub Releases」

## 📝 数据格式

```json
{
  "id": "unique-id",
  "categoryId": "installers",
  "name": "工具名称",
  "description": "工具描述",
  "icon": "🟢",
  "version": "1.0",
  "size": "32 MB",
  "downloadUrl": "https://...",
  "releaseUrl": "https://github.com/.../releases",
  "tags": ["标签1", "标签2"],
  "lastUpdated": "2025-06-01",
  "platform": ["windows", "mac", "linux"],
  "license": "MIT"
}
```

## 🛠 技术栈

- 纯 HTML/CSS/JS — 无框架，无依赖
- GitHub Pages — 免费静态托管
- GitHub API — 在线管理

## 📄 许可证

MIT © Chengdusen