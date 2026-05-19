# 文章管理系统测试用例

## 测试环境

- **Base URL**: https://wenzhang.dingdingoa.cn/api
- **前端地址**: https://wenzhang.dingdingoa.cn/
- **测试账号**: admin / mima2012
- **D1 数据库**: wenzhang (绑定名称: DB)

---

## 测试用例执行说明

### API 测试
使用以下任一方式执行 API 测试：
1. **curl 命令**（在 PowerShell 中执行）
2. **Postman/Apifox** 等 API 工具
3. **浏览器开发者工具** -> Network 面板

### 前端测试
1. 在浏览器中打开 https://wenzhang.dingdingoa.cn/
2. 按 F12 打开开发者工具
3. 切换到 Console 标签页查看错误
4. 切换到 Network 标签页查看请求

---

## 一、认证功能测试

### TC-AUTH-001: 用户登录成功
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/auth/login |
| 请求体 | `{"username": "admin", "password": "mima2012"}` |
| 预期结果 | `{success: true, data: {token: "xxx", user: {...}}}` |
| 优先级 | P0 |

```bash
curl -X POST https://wenzhang.dingdingoa.cn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"mima2012"}'
```

### TC-AUTH-002: 用户登录失败 - 密码错误
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/auth/login |
| 请求体 | `{"username": "admin", "password": "wrongpassword"}` |
| 预期结果 | `{success: false, error: "用户名或密码错误"}` |
| 优先级 | P0 |

```bash
curl -X POST https://wenzhang.dingdingoa.cn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpassword"}'
```

### TC-AUTH-003: 用户登录失败 - 用户不存在
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/auth/login |
| 请求体 | `{"username": "nonexist", "password": "any"}` |
| 预期结果 | `{success: false, error: "用户名或密码错误"}` |
| 优先级 | P1 |

### TC-AUTH-004: 用户注册成功
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/auth/register |
| 请求体 | `{"username": "testuser", "password": "test123456", "email": "test@example.com"}` |
| 预期结果 | `{success: true, data: {userId: N}}` |
| 优先级 | P1 |

```bash
curl -X POST https://wenzhang.dingdingoa.cn/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123456","email":"test@example.com"}'
```

### TC-AUTH-005: 用户注册失败 - 用户名已存在
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/auth/register |
| 请求体 | `{"username": "admin", "password": "test123456"}` |
| 预期结果 | `{success: false, error: "用户名已存在"}` |
| 优先级 | P1 |

### TC-AUTH-006: 用户注册失败 - 用户名太短
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/auth/register |
| 请求体 | `{"username": "ab", "password": "test123456"}` |
| 预期结果 | `{success: false, error: "用户名长度需在3-20个字符之间"}` |
| 优先级 | P2 |

### TC-AUTH-007: 用户注册失败 - 密码太短
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/auth/register |
| 请求体 | `{"username": "newuser", "password": "123"}` |
| 预期结果 | `{success: false, error: "密码长度至少6个字符"}` |
| 优先级 | P2 |

---

## 二、文章功能测试

### TC-ARTICLE-001: 获取文章列表
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/articles |
| 预期结果 | `{success: true, data: {articles: [...], total: N, page: 1}}` |
| 优先级 | P0 |

```bash
curl https://wenzhang.dingdingoa.cn/api/articles
```

### TC-ARTICLE-002: 获取文章列表 - 分页
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/articles?page=1&limit=5 |
| 预期结果 | 返回最多5篇文章 |
| 优先级 | P1 |

### TC-ARTICLE-003: 按分类筛选文章
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/articles?category=tech |
| 预期结果 | 只返回 tech 分类的文章 |
| 优先级 | P1 |

### TC-ARTICLE-004: 获取单篇文章详情 - 按ID
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/article/1 |
| 预期结果 | `{success: true, data: {id: 1, title: "xxx", ...}}` |
| 优先级 | P0 |

```bash
curl https://wenzhang.dingdingoa.cn/api/article/1
```

### TC-ARTICLE-005: 获取不存在的文章
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/article/99999 |
| 预期结果 | `{success: false, error: "文章不存在"}` |
| 优先级 | P1 |

### TC-ARTICLE-006: 创建文章（需登录）
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/articles |
| Header | `Authorization: Bearer <token>` |
| 请求体 | `{"title": "测试文章", "content": "# 标题\n\n正文内容", "summary": "摘要", "status": "published"}` |
| 预期结果 | `{success: true, data: {id: N}}` |
| 优先级 | P0 |

```bash
# 先获取token，然后执行
TOKEN="你的token"
curl -X POST https://wenzhang.dingdingoa.cn/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"测试文章","content":"# 标题\n\n正文内容","summary":"摘要","status":"published"}'
```

### TC-ARTICLE-007: 创建文章失败 - 未登录
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/articles |
| 预期结果 | `{success: false, error: "需要登录", status: 401}` |
| 优先级 | P0 |

### TC-ARTICLE-008: 创建草稿文章
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/articles |
| 请求体 | `{"title": "草稿文章", "content": "内容", "status": "draft"}` |
| 预期结果 | 草稿不显示在首页列表 |
| 优先级 | P1 |

### TC-ARTICLE-009: 更新文章（需登录）
| 项目 | 内容 |
|------|------|
| 接口 | PUT /api/article/:id |
| Header | `Authorization: Bearer <token>` |
| 请求体 | `{"title": "更新后的标题"}` |
| 预期结果 | `{success: true}` |
| 优先级 | P0 |

### TC-ARTICLE-010: 删除文章（需登录）
| 项目 | 内容 |
|------|------|
| 接口 | DELETE /api/article/:id |
| Header | `Authorization: Bearer <token>` |
| 预期结果 | `{success: true}` |
| 优先级 | P0 |

---

## 三、分类功能测试

### TC-CATEGORY-001: 获取分类列表
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/categories |
| 预期结果 | `{success: true, data: [{id: 1, name: "技术", slug: "tech"}, ...]}` |
| 优先级 | P0 |

```bash
curl https://wenzhang.dingdingoa.cn/api/categories
```

### TC-CATEGORY-002: 创建分类（需登录）
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/categories |
| Header | `Authorization: Bearer <token>` |
| 请求体 | `{"name": "测试分类", "slug": "test-category"}` |
| 预期结果 | `{success: true, data: {id: N}}` |
| 优先级 | P1 |

### TC-CATEGORY-003: 创建分类失败 - 未登录
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/categories |
| 预期结果 | `{success: false, error: "需要登录", status: 401}` |
| 优先级 | P1 |

### TC-CATEGORY-004: 更新分类（需登录）
| 项目 | 内容 |
|------|------|
| 接口 | PUT /api/category/:id |
| Header | `Authorization: Bearer <token>` |
| 请求体 | `{"name": "新分类名"}` |
| 预期结果 | `{success: true}` |
| 优先级 | P1 |

### TC-CATEGORY-005: 删除分类（需登录）
| 项目 | 内容 |
|------|------|
| 接口 | DELETE /api/category/:id |
| Header | `Authorization: Bearer <token>` |
| 预期结果 | `{success: true}` |
| 优先级 | P1 |

---

## 四、标签功能测试

### TC-TAG-001: 获取标签列表
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/tags |
| 预期结果 | `{success: true, data: [{id: 1, name: "JavaScript", color: "#f7df1e"}, ...]}` |
| 优先级 | P0 |

```bash
curl https://wenzhang.dingdingoa.cn/api/tags
```

### TC-TAG-002: 创建标签（需登录）
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/tag |
| Header | `Authorization: Bearer <token>` |
| 请求体 | `{"name": "测试标签", "color": "#ff0000"}` |
| 预期结果 | `{success: true, data: {id: N}}` |
| 优先级 | P1 |

### TC-TAG-003: 删除标签（需登录）
| 项目 | 内容 |
|------|------|
| 接口 | DELETE /api/tag/:id |
| Header | `Authorization: Bearer <token>` |
| 预期结果 | `{success: true}` |
| 优先级 | P1 |

---

## 五、搜索功能测试

### TC-SEARCH-001: 关键词搜索
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/search?keyword=测试 |
| 预期结果 | `{success: true, data: [...]}` |
| 优先级 | P0 |

```bash
curl "https://wenzhang.dingdingoa.cn/api/search?keyword=test"
```

### TC-SEARCH-002: 搜索无结果
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/search?keyword=xyzabc123notexist |
| 预期结果 | `{success: true, data: []}` |
| 优先级 | P1 |

### TC-SEARCH-003: 搜索失败 - 无关键词
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/search |
| 预期结果 | `{success: false, error: "请输入搜索关键词"}` |
| 优先级 | P2 |

---

## 六、图片上传测试

### TC-UPLOAD-001: 上传图片（需登录）
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/upload |
| Header | `Authorization: Bearer <token>` |
| Body | FormData: `image=<文件>` |
| 预期结果 | `{success: true, data: {url: "图片URL"}}` |
| 优先级 | P1 |

```bash
TOKEN="你的token"
curl -X POST https://wenzhang.dingdingoa.cn/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test.jpg"
```

### TC-UPLOAD-002: 上传图片失败 - 未登录
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/upload |
| 预期结果 | `{success: false, error: "需要登录", status: 401}` |
| 优先级 | P1 |

---

## 七、统计功能测试

### TC-STATS-001: 获取统计数据
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/stats |
| 预期结果 | `{success: true, data: {articles: N, categories: N, tags: N, users: N}}` |
| 优先级 | P2 |

```bash
curl https://wenzhang.dingdingoa.cn/api/stats
```

---

## 八、前端页面测试

### TC-FRONT-001: 首页访问
| 项目 | 内容 |
|------|------|
| URL | https://wenzhang.dingdingoa.cn/index.html |
| 检查点 | 1. 文章列表正常显示<br>2. 分类筛选正常<br>3. 底部版本号显示 v1.0.6 |
| 预期结果 | 页面正常加载，无 JS 错误 |
| 优先级 | P0 |

### TC-FRONT-002: 文章详情页
| 项目 | 内容 |
|------|------|
| URL | https://wenzhang.dingdingoa.cn/article.html?id=1 |
| 检查点 | 1. Markdown 正确渲染<br>2. 代码高亮正常<br>3. 底部版本号显示 |
| 预期结果 | 文章内容正确显示 |
| 优先级 | P0 |

### TC-FRONT-003: 搜索功能
| 项目 | 内容 |
|------|------|
| URL | https://wenzhang.dingdingoa.cn/search.html?keyword=测试 |
| 检查点 | 1. 搜索结果显示<br>2. 关键词高亮<br>3. 底部版本号显示 |
| 预期结果 | 搜索结果正确显示 |
| 优先级 | P0 |

### TC-FRONT-004: 登录功能
| 项目 | 内容 |
|------|------|
| URL | https://wenzhang.dingdingoa.cn/login.html |
| 检查点 | 1. 输入正确账号登录成功<br>2. 跳转管理页面 |
| 预期结果 | 登录成功，跳转到 manage.html |
| 优先级 | P0 |

### TC-FRONT-005: 编辑器功能
| 项目 | 内容 |
|------|------|
| URL | https://wenzhang.dingdingoa.cn/editor.html |
| 检查点 | 1. Markdown 工具栏可用<br>2. 图片上传功能<br>3. 预览功能 |
| 预期结果 | 编辑器正常加载，需登录 |
| 优先级 | P1 |

### TC-FRONT-006: 管理后台
| 项目 | 内容 |
|------|------|
| URL | https://wenzhang.dingdingoa.cn/manage.html |
| 检查点 | 1. 文章管理列表<br>2. 分类管理<br>3. 标签管理 |
| 预期结果 | 管理功能正常，需登录 |
| 优先级 | P1 |

---

## 九、边界情况测试

### TC-BOUNDARY-001: 空标题创建文章
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/articles |
| Header | `Authorization: Bearer <token>` |
| 请求体 | `{"title": "", "content": "内容"}` |
| 预期结果 | `{success: false, error: "标题不能为空"}` |
| 优先级 | P2 |

### TC-BOUNDARY-002: 超长标题
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/articles |
| Header | `Authorization: Bearer <token>` |
| 请求体 | `{"title": "超过255个字符的标题..."}` |
| 预期结果 | 正常处理或返回错误 |
| 优先级 | P2 |

### TC-BOUNDARY-003: SQL注入测试
| 项目 | 内容 |
|------|------|
| 接口 | GET /api/search?keyword=' OR '1'='1 |
| 预期结果 | 搜索无结果或正确处理，不报错 |
| 优先级 | P2 |

### TC-BOUNDARY-004: XSS攻击测试
| 项目 | 内容 |
|------|------|
| 接口 | POST /api/articles |
| Header | `Authorization: Bearer <token>` |
| 请求体 | `{"title": "<script>alert(1)</script>"}` |
| 预期结果 | 标题被转义存储 |
| 优先级 | P2 |

---

## 测试结果记录

| 用例ID | 用例名称 | 执行结果 | 执行人 | 执行时间 | 备注 |
|--------|----------|----------|--------|----------|------|
| TC-AUTH-001 | 用户登录成功 | - | - | - | |
| TC-AUTH-002 | 用户登录失败-密码错误 | - | - | - | |
| TC-ARTICLE-001 | 获取文章列表 | - | - | - | |
| TC-SEARCH-001 | 关键词搜索 | - | - | - | |
| TC-FRONT-001 | 首页访问 | - | - | - | |
| ... | ... | - | - | - | |

---

## 快速测试脚本

```powershell
# 测试基础API
Write-Host "=== 测试文章列表 ===" -ForegroundColor Cyan
curl https://wenzhang.dingdingoa.cn/api/articles

Write-Host "`n=== 测试分类 ===" -ForegroundColor Cyan
curl https://wenzhang.dingdingoa.cn/api/categories

Write-Host "`n=== 测试标签 ===" -ForegroundColor Cyan
curl https://wenzhang.dingdingoa.cn/api/tags

Write-Host "`n=== 测试搜索 ===" -ForegroundColor Cyan
curl "https://wenzhang.dingdingoa.cn/api/search?keyword=test"

Write-Host "`n=== 测试登录 ===" -ForegroundColor Cyan
curl -X POST https://wenzhang.dingdingoa.cn/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"mima2012"}'
```
