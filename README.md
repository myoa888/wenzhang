# 文章管理系统

一个现代化的文章管理系统，支持 Markdown 写作、分类管理、全文搜索，适用于个人博客或团队文档管理。

## 功能特点

- 📝 **Markdown 编辑器** - 实时预览，支持代码高亮
- 🏷️ **分类与标签** - 灵活的文章组织方式
- 🔍 **全文搜索** - 快速找到需要的文章
- 📱 **响应式设计** - 完美适配手机和电脑
- 🔐 **用户系统** - 注册、登录、文章权限管理
- 💾 **数据持久化** - 基于 Cloudflare D1 数据库

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (原生)
- **后端**: Cloudflare Workers (JavaScript)
- **数据库**: Cloudflare D1 (SQLite)
- **Markdown**: marked.js + highlight.js
- **部署**: Cloudflare Workers/Pages

## 快速部署

### 1. 创建 D1 数据库

```bash
# 登录 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create wenzhang

# 初始化数据库（会输出 database_id，保存下来）
wrangler d1 execute wenzhang --file=./schema.sql
```

### 2. 配置 Workers

编辑 `wrangler.toml`，填入你的数据库信息：

```toml
[[d1_databases]]
binding = "DB"
database_name = "wenzhang"
database_id = "你的-database-id"
```

### 3. 部署 Workers API

```bash
# 安装依赖
npm install

# 部署
npm run deploy
```

部署成功后会得到 Workers URL，例如：`https://wenzhang-api.xxx.workers.dev`

### 4. 配置前端

编辑 `js/config.js`，将 `API_BASE` 改为你的 Workers URL：

```javascript
const API_BASE = 'https://wenzhang-api.xxx.workers.dev/api';
```

### 5. 部署前端

将前端文件部署到 Cloudflare Pages 或其他静态托管：

1. 在 Cloudflare Dashboard 创建 Pages 项目
2. 上传 `index.html`、`article.html`、`login.html` 等文件
3. 或者连接到 GitHub 仓库实现自动部署

## 本地开发

```bash
# 启动 Workers（需要先配置 wrangler.toml）
npm run dev

# 本地 D1 操作
wrangler d1 execute wenzhang --local --file=./schema.sql
```

## 目录结构

```
wenzhang/
├── index.html          # 首页/文章列表
├── article.html        # 文章详情页
├── search.html         # 搜索页
├── login.html          # 登录页
├── register.html       # 注册页
├── editor.html         # 文章编辑器
├── manage.html         # 管理后台
├── css/
│   ├── style.css       # 主样式
│   ├── editor.css     # 编辑器样式
│   └── manage.css      # 管理后台样式
├── js/
│   ├── config.js       # API配置
│   └── api.js          # API封装
├── src/
│   └── index.js        # Workers API
├── schema.sql          # 数据库结构
├── wrangler.toml       # Workers配置
└── package.json        # 项目配置
```

## API 接口

### 公开接口
- `GET /stats` - 获取统计信息
- `GET /categories` - 获取分类列表
- `GET /articles` - 获取文章列表
- `GET /article/:slug` - 获取文章详情
- `GET /search?keyword=` - 搜索文章
- `GET /tags` - 获取标签列表

### 需要认证
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/logout` - 退出登录
- `GET /user` - 获取当前用户
- `GET /my/articles` - 获取我的文章
- `POST /articles` - 创建文章
- `PUT /article/:id` - 更新文章
- `DELETE /article/:id` - 删除文章
- `POST /categories` - 创建分类
- `DELETE /category/:id` - 删除分类

## 使用说明

1. **注册账号** - 访问注册页面创建账号
2. **写文章** - 点击"写文章"进入编辑器
3. **发布** - 编写完成后点击发布
4. **管理** - 在管理后台可以查看、编辑、删除文章

## 注意事项

- 首次部署需要手动在 D1 数据库中执行 `schema.sql` 初始化
- 建议定期备份 D1 数据库
- Workers 有每日请求限制，免费版 100,000 次/天

## License

MIT License
