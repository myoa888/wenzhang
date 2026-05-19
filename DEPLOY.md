# Workers API 部署指南

## 已完成
- ✅ D1 数据库创建完成 (ID: e377f52f-f9aa-4d0d-936e-5e2b3a3994dd)
- ✅ 数据库表结构已初始化
- ✅ 默认分类已添加

## 手动部署 Workers

由于网络限制，请按以下步骤手动部署：

### 方法一：通过 Cloudflare Dashboard（推荐）

1. 访问 https://dash.cloudflare.com
2. 左侧菜单 → **Workers & Pages**
3. 点击 **Create application**
4. 选择 **Create Worker**
5. 名称填写: `wenzhang-api`
6. 点击 **Deploy**
7. 进入 **Settings** → **Bindings**
8. 点击 **Add binding**:
   - Variable name: `DB`
   - Value: 选择 `wenzhang` 数据库
9. 回到 **Edit code**
10. 删除默认代码，复制 `src/index.js` 的内容粘贴进去
11. 点击 **Deploy**

### 方法二：通过 Wrangler CLI

在终端运行：
```bash
cd e:/project/wenzhang
npm install
npx wrangler deploy
```

## 获取 Workers URL

部署成功后，Workers URL 格式为:
```
https://wenzhang-api.aa77a38ad4fddb1c3954afe036c0bf35.workers.dev
```

## 配置前端 API 地址

Workers 部署成功后，请修改 `js/config.js`:

```javascript
const API_BASE = 'https://wenzhang-api.aa77a38ad4fddb1c3954afe036c0bf35.workers.dev/api';
```

## 测试 API

访问以下地址测试：
- https://wenzhang-api.xxx.workers.dev/api/categories
- https://wenzhang-api.xxx.workers.dev/api/stats

## 配置信息

请在 Cloudflare Dashboard 查看:
- **Account ID**: 在 Dashboard 右上角
- **API Token**: 在 https://dash.cloudflare.com/profile/api-tokens 创建
- **D1 Database**: Workers & Pages → D1 → wenzhang
