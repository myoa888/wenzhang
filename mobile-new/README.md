# 手机端新版 (mobile-new)

全新开发的移动端前端，完全独立于旧版实现。

## 目录结构

```
mobile-new/
├── mobile.html        # 首页 - 文章列表、分类筛选
├── article.html       # 文章详情页
├── search.html        # 搜索页
├── editor.html        # Markdown 编辑器
├── login.html        # 登录页
├── register.html     # 注册页
├── my.html           # 我的页面
├── categories.html   # 分类管理
├── stats.html        # 数据统计
├── ai-config.html    # AI 配置
├── ideas.html        # 创意管理
├── css/
│   └── mobile.css    # 统一样式（iOS 风格）
└── js/
    ├── config.js     # 配置文件
    └── api.js        # API 封装
```

## 主要特性

- **完全独立**：不依赖旧版任何代码
- **现代设计**：iOS 风格 UI
- **底部导航**：首页、搜索、写作、我的
- **修复的问题**：
  - 切换页签后文章列表正确显示
  - 加载状态正确管理
  - 滚动加载更多

## 访问方式

直接在浏览器中打开 `mobile.html` 即可预览。

## 注意事项

当前使用模拟数据，实际 API 接入后修改 `js/api.js` 中的请求地址即可。
