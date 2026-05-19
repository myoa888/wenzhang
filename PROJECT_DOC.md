# 文章管理系统项目文档

## 项目概述

基于 Cloudflare Workers/Pages 部署的轻量级文章管理系统，支持 Markdown 编写、分类管理、标签管理、搜索和图片上传。

**在线地址**: https://wenzhang.dingdingoa.cn/

---

## 技术架构

| 组件 | 技术 |
|------|------|
| 前端 | HTML + CSS + JavaScript (原生) |
| 后端 | Cloudflare Workers (_worker.js) |
| 数据库 | Cloudflare D1 (SQLite) |
| 部署 | Cloudflare Pages + GitHub 自动部署 |
| CDN | jsDelivr (Markdown解析), highlight.js (代码高亮) |

---

## 部署信息

### GitHub 仓库
- **地址**: https://github.com/myoa888/wenzhang
- **分支**: master

### Cloudflare Pages
- **项目名**: wenzhang
- **构建命令**: (静态部署，无需构建)
- **输出目录**: /

### Cloudflare Workers
- **Workers URL**: https://wenzhang.dingdingoa.cn/api
- **环境变量**:
  - `IMGBB_API_KEY`: imgbb 图床 API Key（可选，用于图片上传）

### D1 数据库
- **绑定名称**: DB（代码中用 `env.DB` 访问）

---

## 账号信息

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | mima2012 |

---

## 数据库结构 (schema.sql)

```sql
-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 标签表
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章表
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT,
  summary TEXT,
  cover_image TEXT,
  status TEXT DEFAULT 'draft',
  user_id INTEGER,
  category_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 文章标签关联表
CREATE TABLE article_tags (
  article_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

---

## API 文档

### 基础信息
- **Base URL**: `https://wenzhang.dingdingoa.cn/api`
- **认证方式**: Bearer Token (JWT)
- **图片上传**: 需要 Authorization header

### 认证接口

#### POST /api/login - 登录
```json
Request: { "username": "admin", "password": "mima2012" }
Response: { "success": true, "token": "xxx", "user": {...} }
```

#### POST /api/register - 注册
```json
Request: { "username": "xxx", "password": "xxx", "email": "xxx" }
Response: { "success": true, "user_id": 1 }
```

### 文章接口

#### GET /api/articles - 获取文章列表
```
Query: ?page=1&limit=10&category=xxx&keyword=xxx
Response: { "success": true, "data": [...], "total": 100 }
```

#### GET /api/article/:id - 获取文章详情
```
支持 id 或 slug 访问
Response: { "success": true, "data": {...} }
```

#### POST /api/article - 创建文章（需登录）
```json
Headers: Authorization: Bearer <token>
Request: {
  "title": "标题",
  "content": "Markdown内容",
  "summary": "摘要",
  "category_id": 1,
  "tags": [1, 2],
  "cover_image": "图片URL",
  "status": "published"
}
Response: { "success": true, "id": 1 }
```

#### PUT /api/article/:id - 更新文章（需登录）
```json
Headers: Authorization: Bearer <token>
Request: 同创建
Response: { "success": true }
```

#### DELETE /api/article/:id - 删除文章（需登录）
```json
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

### 分类接口

#### GET /api/categories - 获取分类列表
```
Response: { "success": true, "data": [{ "id": 1, "name": "分类名" }] }
```

#### POST /api/category - 创建分类（需登录）
```json
Headers: Authorization: Bearer <token>
Request: { "name": "分类名" }
Response: { "success": true, "id": 1 }
```

#### PUT /api/category/:id - 更新分类（需登录）
```json
Headers: Authorization: Bearer <token>
Request: { "name": "新名称" }
Response: { "success": true }
```

#### DELETE /api/category/:id - 删除分类（需登录）
```json
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

### 标签接口

#### GET /api/tags - 获取标签列表
```
Response: { "success": true, "data": [{ "id": 1, "name": "标签名" }] }
```

#### POST /api/tag - 创建标签（需登录）
```json
Headers: Authorization: Bearer <token>
Request: { "name": "标签名" }
Response: { "success": true, "id": 1 }
```

#### DELETE /api/tag/:id - 删除标签（需登录）
```json
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

### 其他接口

#### GET /api/search - 搜索文章
```
Query: ?keyword=关键词
Response: { "success": true, "data": [...] }
```

#### POST /api/upload - 上传图片（需登录）
```
Headers: Authorization: Bearer <token>
FormData: image: <文件>
Response: { "success": true, "url": "图片URL" }
```

---

## 页面列表

| 页面 | 文件 | 说明 |
|------|------|------|
| 首页 | index.html | 文章列表、分类筛选、标签筛选 |
| 文章详情 | article.html | Markdown渲染、代码高亮 |
| 搜索 | search.html | 关键词搜索 |
| 编辑器 | editor.html | Markdown编辑、图片上传 |
| 管理后台 | manage.html | 文章/分类/标签管理 |
| 登录 | login.html | 用户登录 |
| 注册 | register.html | 用户注册 |
| 共用页脚 | footer.html | 版本号显示 |

---

## 配置文件

### js/config.js
```javascript
const API_BASE = 'https://wenzhang.dingdingoa.cn/api';
const VERSION = '1.0.6';  // 版本号，更新后所有页面自动同步

function loadFooter() {
  // 加载共用页脚
}
```

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | - | 初始版本 |
| 1.0.6 | 2026-05-19 | 添加底部版本号显示、共用footer |

---

## 常用操作

### 1. 修改版本号
编辑 `js/config.js`，修改 `VERSION` 值即可。

### 2. 本地开发
```bash
# 克隆项目
git clone https://github.com/myoa888/wenzhang.git
cd wenzhang

# 本地预览（需要部署 Workers 后才有 API）
# 直接用浏览器打开 HTML 文件即可
```

### 3. 部署更新
```powershell
# 推送到 GitHub，Cloudflare Pages 会自动部署
git add -A
git commit -m "更新说明"
git push
```

### 4. D1 数据库操作
在 Cloudflare Dashboard -> Workers & Pages -> 选择项目 -> D1 中执行 SQL。

### 5. 初始化数据库
在 D1 中执行 `schema.sql` 的内容创建表结构。

---

## 注意事项

1. **API 返回格式**: 所有 API 统一返回 `{ success: true/false, data/error }` 格式
2. **认证**: 需要登录的操作必须携带 `Authorization: Bearer <token>` header
3. **图片上传**: 需要在 Cloudflare Dashboard 设置 `IMGBB_API_KEY` 环境变量，否则使用 base64 内嵌
4. **缓存**: 更新代码后可能需要 Ctrl+F5 强制刷新清除浏览器缓存
5. **D1 绑定**: 数据库绑定名称必须为 `DB`（代码中用 `env.DB`）

---

## 项目文件结构

```
e:/project/wenzhang/
├── _worker.js          # Workers 后端代码
├── index.html          # 首页
├── article.html        # 文章详情
├── search.html         # 搜索页
├── editor.html         # Markdown 编辑器
├── manage.html         # 管理后台
├── login.html          # 登录页
├── register.html       # 注册页
├── footer.html         # 共用页脚
├── schema.sql          # 数据库结构
├── css/
│   └── style.css       # 样式
└── js/
    ├── config.js       # 配置文件
    └── api.js          # API 调用封装
```
