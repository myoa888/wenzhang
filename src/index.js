/**
 * 文章管理系统 API
 * Cloudflare Workers + D1
 */

const HONO_VERSION = '4.0.0';

// 简单的密码哈希 (生产环境建议使用 Web Crypto API)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'wenzhang_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成随机token
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// 验证token
async function verifyToken(token) {
  if (!token) return null;
  const result = await env.DB.prepare(`
    SELECT s.*, u.username, u.email, u.avatar 
    FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token).first();
  return result;
}

// 生成slug
function generateSlug(title, id) {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  return `${base}-${id}`;
}

// 响应助手
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function error(message, status = 400) {
  return json({ success: false, error: message }, status);
}

function success(data, message = 'Success') {
  return json({ success: true, message, data });
}

// ============ API 路由 ============

const API = {
  // 认证相关
  async register(data) {
    const { username, password, email } = data;
    if (!username || !password) {
      return error('用户名和密码不能为空');
    }
    if (username.length < 3 || username.length > 20) {
      return error('用户名长度需在3-20个字符之间');
    }
    if (password.length < 6) {
      return error('密码长度至少6个字符');
    }

    // 检查用户名是否已存在
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(username).first();

    if (existing) {
      return error('用户名已存在');
    }

    const passwordHash = await hashPassword(password);
    
    const result = await env.DB.prepare(
      'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)'
    ).bind(username, passwordHash, email || null).run();

    return success({ userId: result.meta.last_row_id }, '注册成功');
  },

  async login(data) {
    const { username, password } = data;
    if (!username || !password) {
      return error('用户名和密码不能为空');
    }

    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) {
      return error('用户名或密码错误');
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.password_hash) {
      return error('用户名或密码错误');
    }

    // 创建session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30天

    await env.DB.prepare(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, token, expiresAt).run();

    return success({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    }, '登录成功');
  },

  async logout(token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return success(null, '已退出登录');
  },

  async getUser(token) {
    const user = await verifyToken(token);
    if (!user) {
      return error('未登录或登录已过期', 401);
    }
    return success({
      id: user.user_id,
      username: user.username,
      email: user.email,
      avatar: user.avatar
    });
  },

  // 分类管理
  async getCategories() {
    const categories = await env.DB.prepare(
      'SELECT * FROM categories ORDER BY sort_order ASC'
    ).all();
    return success(categories.results);
  },

  async createCategory(data, token) {
    const user = await verifyToken(token);
    if (!user) return error('需要登录', 401);

    const { name, slug, description, sort_order } = data;
    if (!name || !slug) return error('分类名称和slug不能为空');

    try {
      const result = await env.DB.prepare(
        'INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)'
      ).bind(name, slug, description || '', sort_order || 0).run();
      return success({ id: result.meta.last_row_id }, '分类创建成功');
    } catch (e) {
      return error('分类slug已存在或创建失败');
    }
  },

  async updateCategory(id, data, token) {
    const user = await verifyToken(token);
    if (!user) return error('需要登录', 401);

    const { name, description, sort_order } = data;
    await env.DB.prepare(
      'UPDATE categories SET name = ?, description = ?, sort_order = ? WHERE id = ?'
    ).bind(name, description, sort_order || 0, id).run();
    return success(null, '分类更新成功');
  },

  async deleteCategory(id, token) {
    const user = await verifyToken(token);
    if (!user) return error('需要登录', 401);

    // 检查该分类下是否有文章
    const articles = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM articles WHERE category_id = ?'
    ).bind(id).first();

    if (articles.count > 0) {
      return error('该分类下有文章，无法删除');
    }

    await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    return success(null, '分类删除成功');
  },

  // 文章管理
  async getArticles(params) {
    const { page = 1, limit = 10, category, status, keyword, user_id } = params;
    const offset = (page - 1) * limit;

    let where = "WHERE a.status = 'published'";
    const bindings = [];

    if (category) {
      where += " AND c.slug = ?";
      bindings.push(category);
    }

    if (user_id) {
      where += " AND a.user_id = ?";
      bindings.push(user_id);
    }

    if (keyword) {
      where += " AND (a.title LIKE ? OR a.content LIKE ?)";
      bindings.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM articles a 
       LEFT JOIN categories c ON a.category_id = c.id 
       ${where}`
    ).bind(...bindings).first();

    const articles = await env.DB.prepare(
      `SELECT a.*, c.name as category_name, c.slug as category_slug,
              u.username as author_name
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN users u ON a.user_id = u.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...bindings, limit, offset).all();

    return success({
      articles: articles.results,
      total: countResult.total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.total / limit)
    });
  },

  async getArticle(slug) {
    const article = await env.DB.prepare(
      `SELECT a.*, c.name as category_name, c.slug as category_slug,
              u.username as author_name
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.slug = ?`
    ).bind(slug).first();

    if (!article) {
      return error('文章不存在', 404);
    }

    // 增加浏览量
    await env.DB.prepare(
      'UPDATE articles SET view_count = view_count + 1 WHERE id = ?'
    ).bind(article.id).run();

    // 获取标签
    const tags = await env.DB.prepare(
      `SELECT t.* FROM tags t
       JOIN article_tags at ON t.id = at.tag_id
       WHERE at.article_id = ?`
    ).bind(article.id).all();

    article.tags = tags.results;

    return success(article);
  },

  async getMyArticles(token, params) {
    const user = await verifyToken(token);
    if (!user) return error('需要登录', 401);

    const { page = 1, limit = 20, status } = params;
    const offset = (page - 1) * limit;

    let where = 'WHERE a.user_id = ?';
    const bindings = [user.user_id];

    if (status) {
      where += ' AND a.status = ?';
      bindings.push(status);
    }

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM articles a ${where}`
    ).bind(...bindings).first();

    const articles = await env.DB.prepare(
      `SELECT a.*, c.name as category_name
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...bindings, limit, offset).all();

    return success({
      articles: articles.results,
      total: countResult.total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  },

  async createArticle(data, token) {
    const user = await verifyToken(token);
    if (!user) return error('需要登录', 401);

    const { title, content, summary, category_id, cover_image, tags, status } = data;
    if (!title || !content) return error('标题和内容不能为空');

    // 生成slug
    const tempResult = await env.DB.prepare(
      'INSERT INTO articles (title, content, user_id) VALUES (?, ?, ?)'
    ).bind(title, content, user.user_id).run();

    const id = tempResult.meta.last_row_id;
    const slug = generateSlug(title, id);

    await env.DB.prepare(
      'UPDATE articles SET slug = ? WHERE id = ?'
    ).bind(slug, id).run();

    // 更新其他字段
    await env.DB.prepare(
      `UPDATE articles SET 
        summary = ?, category_id = ?, cover_image = ?, 
        status = ?, published_at = CASE WHEN ? = 'published' THEN datetime('now') ELSE NULL END
       WHERE id = ?`
    ).bind(
      summary || content.substring(0, 200),
      category_id || null,
      cover_image || null,
      status || 'draft',
      status || 'draft',
      id
    ).run();

    // 处理标签
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await env.DB.prepare(
          'SELECT id FROM tags WHERE name = ?'
        ).bind(tagName).first();

        if (!tag) {
          const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
          const tagResult = await env.DB.prepare(
            'INSERT INTO tags (name, slug) VALUES (?, ?)'
          ).bind(tagName, tagSlug).run();
          tag = { id: tagResult.meta.last_row_id };
        }

        await env.DB.prepare(
          'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)'
        ).bind(id, tag.id).run();
      }
    }

    return success({ id, slug }, '文章创建成功');
  },

  async updateArticle(id, data, token) {
    const user = await verifyToken(token);
    if (!user) return error('需要登录', 401);

    // 检查文章是否属于当前用户
    const article = await env.DB.prepare(
      'SELECT * FROM articles WHERE id = ?'
    ).bind(id).first();

    if (!article) return error('文章不存在', 404);
    if (article.user_id !== user.user_id) return error('无权修改此文章', 403);

    const { title, content, summary, category_id, cover_image, tags, status } = data;

    await env.DB.prepare(
      `UPDATE articles SET 
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        summary = COALESCE(?, summary),
        category_id = COALESCE(?, category_id),
        cover_image = COALESCE(?, cover_image),
        status = COALESCE(?, status),
        updated_at = datetime('now'),
        published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN datetime('now') ELSE published_at END
       WHERE id = ?`
    ).bind(
      title, content, summary, category_id, cover_image, status, status, id
    ).run();

    // 更新标签
    if (tags !== undefined) {
      await env.DB.prepare('DELETE FROM article_tags WHERE article_id = ?').bind(id).run();
      
      for (const tagName of tags) {
        let tag = await env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
        if (!tag) {
          const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
          const tagResult = await env.DB.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').bind(tagName, tagSlug).run();
          tag = { id: tagResult.meta.last_row_id };
        }
        await env.DB.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)').bind(id, tag.id).run();
      }
    }

    return success(null, '文章更新成功');
  },

  async deleteArticle(id, token) {
    const user = await verifyToken(token);
    if (!user) return error('需要登录', 401);

    const article = await env.DB.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first();
    if (!article) return error('文章不存在', 404);
    if (article.user_id !== user.user_id) return error('无权删除此文章', 403);

    await env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(id).run();
    return success(null, '文章删除成功');
  },

  // 搜索
  async search(keyword) {
    if (!keyword) return error('请输入搜索关键词');

    const articles = await env.DB.prepare(
      `SELECT a.*, c.name as category_name, u.username as author_name
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.status = 'published' 
         AND (a.title LIKE ? OR a.content LIKE ? OR a.summary LIKE ?)
       ORDER BY a.created_at DESC
       LIMIT 50`
    ).bind(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`).all();

    return success(articles.results);
  },

  // 获取标签列表
  async getTags() {
    const tags = await env.DB.prepare(
      'SELECT t.*, COUNT(at.article_id) as article_count FROM tags t LEFT JOIN article_tags at ON t.id = at.tag_id GROUP BY t.id ORDER BY article_count DESC'
    ).all();
    return success(tags.results);
  },

  // 统计
  async getStats() {
    const stats = {
      articles: await env.DB.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published'").first(),
      categories: await env.DB.prepare('SELECT COUNT(*) as count FROM categories').first(),
      users: await env.DB.prepare('SELECT COUNT(*) as count FROM users').first(),
      views: await env.DB.prepare('SELECT SUM(view_count) as total FROM articles').first()
    };
    return success({
      articles: stats.articles?.count || 0,
      categories: stats.categories?.count || 0,
      users: stats.users?.count || 0,
      views: stats.views?.total || 0
    });
  }
};

// 请求处理
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // 获取token
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  // 解析请求体
  let body = {};
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.json();
    } catch (e) {
      // ignore
    }
  }

  // 路由匹配
  try {
    // 公开接口
    if (path === '/stats' && method === 'GET') {
      return API.getStats();
    }

    if (path === '/categories' && method === 'GET') {
      return API.getCategories();
    }

    if (path === '/articles' && method === 'GET') {
      return API.getArticles({
        page: url.searchParams.get('page'),
        limit: url.searchParams.get('limit'),
        category: url.searchParams.get('category'),
        keyword: url.searchParams.get('keyword')
      });
    }

    if (path.match(/^\/article\/([^/]+)$/) && method === 'GET') {
      const slug = path.match(/^\/article\/([^/]+)$/)[1];
      return API.getArticle(slug);
    }

    if (path === '/search' && method === 'GET') {
      return API.search(url.searchParams.get('keyword'));
    }

    if (path === '/tags' && method === 'GET') {
      return API.getTags();
    }

    // 认证接口
    if (path === '/auth/register' && method === 'POST') {
      return API.register(body);
    }

    if (path === '/auth/login' && method === 'POST') {
      return API.login(body);
    }

    if (path === '/auth/logout' && method === 'POST') {
      return API.logout(token);
    }

    if (path === '/user' && method === 'GET') {
      return API.getUser(token);
    }

    // 用户文章接口
    if (path === '/my/articles' && method === 'GET') {
      return API.getMyArticles(token, {
        page: url.searchParams.get('page'),
        limit: url.searchParams.get('limit'),
        status: url.searchParams.get('status')
      });
    }

    // 分类管理
    if (path === '/categories' && method === 'POST') {
      return API.createCategory(body, token);
    }

    if (path.match(/^\/category\/(\d+)$/) && method === 'PUT') {
      const id = path.match(/^\/category\/(\d+)$/)[1];
      return API.updateCategory(parseInt(id), body, token);
    }

    if (path.match(/^\/category\/(\d+)$/) && method === 'DELETE') {
      const id = path.match(/^\/category\/(\d+)$/)[1];
      return API.deleteCategory(parseInt(id), token);
    }

    // 文章管理
    if (path === '/articles' && method === 'POST') {
      return API.createArticle(body, token);
    }

    if (path.match(/^\/article\/(\d+)$/) && method === 'PUT') {
      const id = path.match(/^\/article\/(\d+)$/)[1];
      return API.updateArticle(parseInt(id), body, token);
    }

    if (path.match(/^\/article\/(\d+)$/) && method === 'DELETE') {
      const id = path.match(/^\/article\/(\d+)$/)[1];
      return API.deleteArticle(parseInt(id), token);
    }

    return error('API不存在', 404);
  } catch (e) {
    console.error(e);
    return error('服务器错误: ' + e.message, 500);
  }
}

export default {
  fetch: handleRequest
};
