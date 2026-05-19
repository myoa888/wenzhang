/**
 * Cloudflare Pages Workers API
 * 处理 /api/* 请求，其他转发给静态资源
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // 非 API 请求转发给静态资源
    if (!pathname.startsWith('/api')) {
      try {
        return await env.ASSETS.fetch(request);
      } catch (e) {
        return new Response('Static asset error: ' + e.message, { status: 500 });
      }
    }
    
    const path = pathname.replace(/^\/api/, '') || '/';
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    async function hashPassword(password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + 'wenzhang_salt_2024');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function generateToken() {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }

    async function verifyToken(token) {
      if (!token || !env.DB) return null;
      try {
        const result = await env.DB.prepare(
          `SELECT s.*, u.username, u.email, u.avatar FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`
        ).bind(token).first();
        return result;
      } catch (e) { return null; }
    }

    function generateSlug(title, id) {
      const base = title.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/g, '').replace(/\s+/g, '-').substring(0, 50);
      return `${base}-${id}`;
    }

    function json(data, status = 200) {
      return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    function error(message, status = 400) {
      return json({ success: false, error: message }, status);
    }

    function success(data, message = 'Success') {
      return json({ success: true, message, data });
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    let body = {};
    
    if (method !== 'GET' && method !== 'HEAD') {
      try { body = await request.json(); } catch (e) {}
    }

    const DB = env.DB;

    // DB not bound
    if (!DB) {
      return error('数据库未连接，请联系管理员', 500);
    }

    try {
      // Stats
      if (path === '/stats' && method === 'GET') {
        const stats = {
          articles: await DB.prepare("SELECT COUNT(*) as c FROM articles WHERE status = 'published'").first(),
          categories: await DB.prepare('SELECT COUNT(*) as c FROM categories').first(),
          users: await DB.prepare('SELECT COUNT(*) as c FROM users').first(),
          views: await DB.prepare('SELECT SUM(view_count) as t FROM articles').first()
        };
        return json({ articles: stats.articles?.c || 0, categories: stats.categories?.c || 0, users: stats.users?.c || 0, views: stats.views?.t || 0 });
      }

      // Categories
      if (path === '/categories' && method === 'GET') {
        const categories = await DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
        return json(categories.results);
      }

      // Articles list
      if (path === '/articles' && method === 'GET') {
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;
        const category = url.searchParams.get('category');
        const keyword = url.searchParams.get('keyword');

        let where = "WHERE a.status = 'published'";
        const bindings = [];
        if (category) { where += " AND c.slug = ?"; bindings.push(category); }
        if (keyword) { where += " AND (a.title LIKE ? OR a.content LIKE ?)"; bindings.push(`%${keyword}%`, `%${keyword}%`); }

        const countResult = await DB.prepare(`SELECT COUNT(*) as total FROM articles a LEFT JOIN categories c ON a.category_id = c.id ${where}`).bind(...bindings).first();
        const articles = await DB.prepare(`SELECT a.*, c.name as category_name, c.slug as category_slug, u.username as author_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id LEFT JOIN users u ON a.user_id = u.id ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all();

        return json({ articles: articles.results, total: countResult.total, page, limit, totalPages: Math.ceil(countResult.total / limit) });
      }

      // Article detail
      const articleMatch = path.match(/^\/article\/([^/]+)$/);
      if (articleMatch && method === 'GET') {
        const slug = articleMatch[1];
        const article = await DB.prepare(`SELECT a.*, c.name as category_name, c.slug as category_slug, u.username as author_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id LEFT JOIN users u ON a.user_id = u.id WHERE a.slug = ?`).bind(slug).first();
        if (!article) return error('文章不存在', 404);
        await DB.prepare('UPDATE articles SET view_count = view_count + 1 WHERE id = ?').bind(article.id).run();
        const tags = await DB.prepare(`SELECT t.* FROM tags t JOIN article_tags at ON t.id = at.tag_id WHERE at.article_id = ?`).bind(article.id).all();
        article.tags = tags.results;
        return json(article);
      }

      // Search
      if (path === '/search' && method === 'GET') {
        const keyword = url.searchParams.get('keyword');
        if (!keyword) return error('请输入搜索关键词');
        const articles = await DB.prepare(`SELECT a.*, c.name as category_name, u.username as author_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id LEFT JOIN users u ON a.user_id = u.id WHERE a.status = 'published' AND (a.title LIKE ? OR a.content LIKE ?) ORDER BY a.created_at DESC LIMIT 50`).bind(`%${keyword}%`, `%${keyword}%`).all();
        return json(articles.results);
      }

      // Tags
      if (path === '/tags' && method === 'GET') {
        const tags = await DB.prepare('SELECT t.*, COUNT(at.article_id) as article_count FROM tags t LEFT JOIN article_tags at ON t.id = at.tag_id GROUP BY t.id ORDER BY article_count DESC').all();
        return json(tags.results);
      }

      // Register
      if (path === '/auth/register' && method === 'POST') {
        const { username, password, email } = body;
        if (!username || !password) return error('用户名和密码不能为空');
        if (username.length < 3 || username.length > 20) return error('用户名长度需在3-20个字符之间');
        if (password.length < 6) return error('密码长度至少6个字符');
        const existing = await DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
        if (existing) return error('用户名已存在');
        const passwordHash = await hashPassword(password);
        const result = await DB.prepare('INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)').bind(username, passwordHash, email || null).run();
        return success({ userId: result.meta.last_row_id }, '注册成功');
      }

      // Login
      if (path === '/auth/login' && method === 'POST') {
        const { username, password } = body;
        if (!username || !password) return error('用户名和密码不能为空');
        const user = await DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
        if (!user) return error('用户名或密码错误');
        const passwordHash = await hashPassword(password);
        if (passwordHash !== user.password_hash) return error('用户名或密码错误');
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await DB.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').bind(user.id, token, expiresAt).run();
        return success({ token, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar } }, '登录成功');
      }

      // Logout
      if (path === '/auth/logout' && method === 'POST') {
        await DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
        return success(null, '已退出登录');
      }

      // User info
      if (path === '/user' && method === 'GET') {
        const user = await verifyToken(token);
        if (!user) return error('未登录或登录已过期', 401);
        return json({ id: user.user_id, username: user.username, email: user.email, avatar: user.avatar });
      }

      // My articles
      if (path === '/my/articles' && method === 'GET') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 20;
        const offset = (page - 1) * limit;
        const status = url.searchParams.get('status');
        let where = 'WHERE a.user_id = ?';
        const bindings = [user.user_id];
        if (status) { where += ' AND a.status = ?'; bindings.push(status); }
        const countResult = await DB.prepare(`SELECT COUNT(*) as total FROM articles a ${where}`).bind(...bindings).first();
        const articles = await DB.prepare(`SELECT a.*, c.name as category_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all();
        return json({ articles: articles.results, total: countResult.total, page, limit });
      }

      // Create article
      if (path === '/articles' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const { title, content, summary, category_id, cover_image, tags, status } = body;
        if (!title || !content) return error('标题和内容不能为空');
        const tempResult = await DB.prepare('INSERT INTO articles (title, content, user_id) VALUES (?, ?, ?)').bind(title, content, user.user_id).run();
        const id = tempResult.meta.last_row_id;
        const slug = generateSlug(title, id);
        await DB.prepare('UPDATE articles SET slug = ? WHERE id = ?').bind(slug, id).run();
        await DB.prepare(`UPDATE articles SET summary = ?, category_id = ?, cover_image = ?, status = ?, published_at = CASE WHEN ? = 'published' THEN datetime('now') ELSE NULL END WHERE id = ?`).bind(summary || content.substring(0, 200), category_id || null, cover_image || null, status || 'draft', status || 'draft', id).run();
        if (tags && tags.length > 0) {
          for (const tagName of tags) {
            let tag = await DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
            if (!tag) {
              const tagResult = await DB.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').bind(tagName, tagName.toLowerCase().replace(/\s+/g, '-')).run();
              tag = { id: tagResult.meta.last_row_id };
            }
            await DB.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)').bind(id, tag.id).run();
          }
        }
        return success({ id, slug }, '文章创建成功');
      }

      // Update article
      const updateMatch = path.match(/^\/article\/(\d+)$/);
      if (updateMatch && method === 'PUT') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = updateMatch[1];
        const article = await DB.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first();
        if (!article) return error('文章不存在', 404);
        if (article.user_id !== user.user_id) return error('无权修改此文章', 403);
        const { title, content, summary, category_id, cover_image, tags, status } = body;
        await DB.prepare(`UPDATE articles SET title = COALESCE(?, title), content = COALESCE(?, content), summary = COALESCE(?, summary), category_id = COALESCE(?, category_id), cover_image = COALESCE(?, cover_image), status = COALESCE(?, status), updated_at = datetime('now'), published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN datetime('now') ELSE published_at END WHERE id = ?`).bind(title, content, summary, category_id, cover_image, status, status, id).run();
        if (tags !== undefined) {
          await DB.prepare('DELETE FROM article_tags WHERE article_id = ?').bind(id).run();
          for (const tagName of tags) {
            let tag = await DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
            if (!tag) {
              const tagResult = await DB.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').bind(tagName, tagName.toLowerCase().replace(/\s+/g, '-')).run();
              tag = { id: tagResult.meta.last_row_id };
            }
            await DB.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)').bind(id, tag.id).run();
          }
        }
        return success(null, '文章更新成功');
      }

      // Delete article
      if (updateMatch && method === 'DELETE') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = updateMatch[1];
        const article = await DB.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first();
        if (!article) return error('文章不存在', 404);
        if (article.user_id !== user.user_id) return error('无权删除此文章', 403);
        await DB.prepare('DELETE FROM articles WHERE id = ?').bind(id).run();
        return success(null, '文章删除成功');
      }

      return error('API不存在', 404);
    } catch (e) {
      console.error(e);
      return error('服务器错误: ' + e.message, 500);
    }
  }
};