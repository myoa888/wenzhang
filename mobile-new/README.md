# 手机端新版 (mobile-new)

一个完全独立于旧版 `mobile.html` 的全新手机端前端。

## 目录结构

```
mobile-new/
├── mobile.html        # 首页 - 文章列表、搜索、分类筛选
├── article.html       # 文章详情页
├── search.html        # 搜索页 - 支持搜索历史
├── editor.html        # 写文章 - Markdown 编辑器
├── login.html         # 登录页
├── register.html     # 注册页
├── my.html           # 我的 - 用户信息、统计
├── categories.html    # 分类管理
├── stats.html         # 数据统计
├── ai-config.html     # AI 配置管理
├── ideas.html         # 创意管理
├── css/
│   └── mobile.css     # 统一的样式文件
└── js/
    ├── config.js      # 配置文件
    └── api.js         # API 请求封装
```

## 特性

- **完全独立**：不依赖旧版任何代码和样式
- **现代设计**：iOS 风格 UI，简洁美观
- **组件化样式**：统一的设计语言
- **响应式适配**：适配各种手机屏幕
- **无缝体验**：底部导航流畅切换

## 使用方式

直接在浏览器中打开 `mobile.html` 即可访问。

## API 对接

配置文件位于 `js/config.js`，修改 `API_BASE` 为你的后端地址：

```javascript
const CONFIG = {
  API_BASE: 'https://你的域名/api',
  // ...
};
```

## 页面说明

| 页面 | 功能 |
|------|------|
| mobile.html | 首页，展示文章列表 |
| search.html | 搜索文章 |
| editor.html | 编写/编辑文章 |
| login.html | 用户登录 |
| register.html | 用户注册 |
| my.html | 个人中心 |
| categories.html | 分类管理 |
| stats.html | 数据统计 |
| ai-config.html | AI 配置 |
| ideas.html | 创意记录 |
