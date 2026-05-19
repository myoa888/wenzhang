# 文章管理系统 - wenzhang

一个基于 Cloudflare Workers + D1 的文章管理系统，支持 Markdown 写作、用户登录、全文搜索等功能。

## 功能特点

- 多用户注册/登录系统
- Markdown 文章编辑器（实时预览）
- 文章分类和标签管理
- 全文搜索
- 响应式设计（支持手机和电脑）
- 访问统计

## 技术栈

- **前端**: HTML5 + CSS3 + JavaScript
- **后端**: Cloudflare Workers/Pages Functions
- **数据库**: Cloudflare D1 (SQLite)
- **部署**: Cloudflare Pages

## 部署指南

### 1. 创建 D1 数据库

在 Cloudflare Dashboard:
1. 访问 Workers & Pages → D1
2. 创建名为 `wenzhang` 的数据库
3. 复制数据库 ID

### 2. 初始化数据库

运行以下命令：
```bash
wrangler login
wrangler d1 execute wenzhang --file=./schema.sql
```

### 3. 部署到 Cloudflare Pages

1. 在 GitHub 创建仓库，上传代码
2. 访问 https://pages.cloudflare.com
3. 选择 "Create a project" → "Connect to Git"
4. 选择仓库并部署

### 4. 绑定 D1 数据库

在 Pages 项目设置中:
1. Settings → Functions → D1 Database Bindings
2. 添加绑定:
   - Variable name: `DB`
   - D1 database: `wenzhang`

### 5. 配置前端 API 地址

修改 `js/config.js` 中的 `API_BASE`:
```javascript
const API_BASE = 'https://你的项目.pages.dev/api';
```

## 项目结构

```
wenzhang/
├── index.html          # 首页/文章列表
├── article.html        # 文章详情页
├── search.html          # 搜索页
├── login.html          # 登录页
├── register.html       # 注册页
├── editor.html         # 文章编辑器
├── manage.html         # 管理后台
├── css/                # 样式文件
├── js/                 # JavaScript 文件
│   ├── config.js       # API 配置
│   └── api.js          # API 请求封装
├── functions/          # Cloudflare Pages Functions
│   └── api/
│       └── [path].js   # API 路由处理
├── schema.sql          # 数据库 Schema
└── wrangler.toml       # Workers 配置
```

## API 接口

### 公开接口
- `GET /api/stats` - 获取统计数据
- `GET /api/categories` - 获取分类列表
- `GET /api/articles` - 获取文章列表
- `GET /api/article/:slug` - 获取文章详情
- `GET /api/search?keyword=xxx` - 搜索文章
- `GET /api/tags` - 获取标签列表

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/user` - 获取当前用户信息

### 管理接口（需登录）
- `GET /api/my/articles` - 获取我的文章
- `POST /api/articles` - 创建文章
- `PUT /api/article/:id` - 更新文章
- `DELETE /api/article/:id` - 删除文章

## License

MIT
