/**
 * Cloudflare Pages Workers API
 * 处理 /api/* 请求，其他转发给静态资源
 */

// 数据库初始化SQL（只包含核心表）
const INIT_TABLES = [
  // 用户表
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  // 分类表
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  // 文章表
  `CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    cover_image TEXT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    status TEXT DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    allow_comment INTEGER DEFAULT 1,
    need_regenerate INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME
  )`,
  // 标签表
  `CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#666666'
  )`,
  // 文章标签关联表
  `CREATE TABLE IF NOT EXISTS article_tags (
    article_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (article_id, tag_id)
  )`,
  // 评论表
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    issue_type TEXT,
    fixed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  // 会话表
  `CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  // 创意想法表（缺少的表）
  `CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'pending',
    category_id INTEGER,
    article_id INTEGER,
    priority INTEGER DEFAULT 0,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  // 待办任务表
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    assignee TEXT DEFAULT 'user',
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL,
    related_article_id INTEGER,
    related_idea_id INTEGER,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending',
    due_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )`,
  // 附件表
  `CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    idea_id INTEGER,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  // AI生成记录表
  `CREATE TABLE IF NOT EXISTS ai_generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id INTEGER,
    article_id INTEGER,
    user_id INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    model TEXT NOT NULL,
    result TEXT,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    tokens_used INTEGER,
    cost DECIMAL(10,4),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )`,
  // AI 配置表（支持多配置）
  `CREATE TABLE IF NOT EXISTS ai_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    provider TEXT DEFAULT 'siliconflow',
    model TEXT DEFAULT 'deepseek-ai/DeepSeek-V3',
    api_key TEXT,
    api_base TEXT DEFAULT 'https://api.siliconflow.cn/v1',
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
  )`,
  // 迁移旧数据
  `INSERT OR IGNORE INTO ai_config (user_id, name, provider, model, api_key, api_base, temperature, max_tokens, is_default)
   SELECT user_id, '默认配置', provider, model, api_key, api_base, temperature, max_tokens, 1
   FROM (
     SELECT user_id, provider, model, api_key, api_base, temperature, max_tokens
     FROM ai_config WHERE id IN (SELECT min(id) FROM ai_config GROUP BY user_id)
   )`,
  // 修复：添加缺失的 is_default 列（忽略已存在的错误）
  `ALTER TABLE ai_config ADD COLUMN is_default INTEGER DEFAULT 0`,
  // 文章审核历史表
  `CREATE TABLE IF NOT EXISTS article_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    revision_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    cover_image TEXT,
    comment TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  // 默认数据
  `INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES
  ('技术', '技术', '技术文章、编程、软件开发', 1),
  ('生活', '生活', '生活随笔、日常记录', 2),
  ('笔记', '笔记', '学习笔记、知识整理', 3),
  ('其他', '其他', '其他类型文章', 99)`,
  `INSERT OR IGNORE INTO users (id, username, password_hash, email, avatar) 
  VALUES (1, 'ai_assistant', 'ai_no_password', 'ai@system.local', '/assets/ai-avatar.png')`
];

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

    // 初始化数据库（首次访问时创建表）
    if (env.DB) {
      try {
        for (const sql of INIT_TABLES) {
          await env.DB.prepare(sql).run();
        }
        // 兼容旧表：为已存在的 ideas 表添加 category_id 列
        try {
          await env.DB.prepare('ALTER TABLE ideas ADD COLUMN category_id INTEGER').run();
        } catch (e) {
          // 列已存在时会报错，忽略
        }
      } catch (e) {
        console.error('数据库初始化失败:', e);
      }
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

    async function getUserIdFromToken(token) {
      if (!token || !DB) return null;
      try {
        const result = await DB.prepare(
          `SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')`
        ).bind(token).first();
        return result?.user_id || null;
      } catch (e) { return null; }
    }
    
    // 获取用户的 AI 配置（优先使用默认配置）
    async function getUserAIConfig(userId) {
      const defaultKey = 'sk-sapjibitygyiqnqfpcvjpaqpvprxnodwvdjmijvfobnyudap';
      
      // 优先获取默认配置
      let config = await DB.prepare('SELECT * FROM ai_config WHERE user_id = ? AND is_default = 1').bind(userId).first();
      
      // 如果没有默认配置，获取第一个
      if (!config) {
        config = await DB.prepare('SELECT * FROM ai_config WHERE user_id = ? ORDER BY id ASC LIMIT 1').bind(userId).first();
      }
      
      if (config && config.api_key) {
        return {
          apiKey: config.api_key,
          model: config.model,
          apiBase: config.api_base || 'https://api.siliconflow.cn/v1',
          temperature: config.temperature || 0.7,
          maxTokens: config.max_tokens || 2000
        };
      }
      
      // 使用系统默认配置
      return {
        apiKey: defaultKey,
        model: 'deepseek-ai/DeepSeek-V3',
        apiBase: 'https://api.siliconflow.cn/v1',
        temperature: 0.7,
        maxTokens: 2000
      };
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

    const DB = env.DB;

    // DB not bound
    if (!DB) {
      return error('数据库未连接，请联系管理员', 500);
    }

    try {
      // Parse JSON body for non-upload / non-multipart requests
      // 必须在所有需要 body 的 API 之前解析
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const ct = request.headers.get('content-type') || '';
      if (!ct.includes('multipart/form-data')) {
        try { body = await request.json(); } catch (e) {}
      }
    }

    // Image/File upload (multipart form data) — 优先使用R2存储，无R2时降级为base64内嵌
    if (path === '/upload' && method === 'POST') {
      const user = await verifyToken(token);
      if (!user) return error('需要登录', 401);

      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return error('需要上传文件', 400);
      }

      try {
        const formData = await request.formData();
        const file = formData.get('image') || formData.get('file');
        if (!file) return error('未找到文件', 400);

        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const ext = file.name.split('.').pop() || 'png';
        const mimeType = file.type || `image/${ext}`;
        const originalName = file.name;
        const size = buffer.byteLength;

        // 限制上传大小（R2也建议限制）
        if (size > 5 * 1024 * 1024) {
          return error('文件大小超过5MB限制', 413);
        }

        let storedUrl;
        const filename = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

        if (env.ASSETS_BUCKET) {
          // 使用 R2 存储
          await env.ASSETS_BUCKET.put(filename, buffer, { httpMetadata: { contentType: mimeType } });
          storedUrl = `${url.origin}/files/${filename}`;
        } else {
          // 无R2降级：小图片(<500KB)用base64内嵌，大图片提示配置R2
          if (size > 500 * 1024) {
            return error('图片大于500KB，请先配置 R2 存储服务。建议前往 Cloudflare 控制台创建 R2 Bucket 并绑定 ASSETS_BUCKET', 503);
          }
          // base64 Data URL（直接嵌入文章，无需外部存储）
          const base64 = btoa(String.fromCharCode(...bytes));
          storedUrl = `data:${mimeType};base64,${base64}`;
        }

        // 记录到附件表
        await DB.prepare(`INSERT INTO attachments (user_id, filename, original_name, mime_type, size, storage_path, url) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .bind(user.user_id, filename, originalName, mimeType, size, env.ASSETS_BUCKET ? filename : 'base64-inline', storedUrl).run();

        return success({ url: storedUrl, filename, originalName, size }, '上传成功');
      } catch (e) {
        return error('上传失败: ' + e.message, 500);
      }
    }

    // ========== AI 文生图 API ==========
    if (path === '/ai/image' && method === 'POST') {
      const user = await verifyToken(token);
      if (!user) return error('需要登录', 401);
      const { prompt, width = 1024, height = 1024 } = body;
      if (!prompt) return error('请输入图片描述');

      try {
        let imageUrl = null;

        // 使用 SiliconFlow API (需要配置)
        const imgApiKey = env.IMAGE_API_KEY || 'sk-sapjibitygyiqnqfpcvjpaqpvprxnodwvdjmijvfobnyudap';
        try {
          const res = await fetch('https://api.siliconflow.cn/v1/image/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${imgApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'stabilityai/stable-diffusion-3-medium',
              prompt,
              image_size: `${width}x${height}`
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.images && data.images[0]) {
              imageUrl = data.images[0].url;
            }
          }
        } catch (sfErr) {
          console.log('SiliconFlow 图片API不可用:', sfErr.message);
        }
        
        // 备用：使用免费 Z-Image API (无需key)
        if (!imageUrl) {
          try {
            const zImageRes = await fetch('https://zimage.run/api/v1/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, width, height })
            });
            if (zImageRes.ok) {
              const zData = await zImageRes.json();
              if (zData.image_url) {
                imageUrl = zData.image_url;
              }
            }
          } catch (zErr) {
            console.log('Z-Image API不可用:', zErr.message);
          }
        }
        
        if (!imageUrl) {
          return error('图片生成服务暂时不可用，请稍后重试', 503);
        }

        // 如果配置了 R2 Storage，下载图片并保存到 R2
        if (env.ASSETS_BUCKET) {
          try {
            const imageRes = await fetch(imageUrl);
            if (imageRes.ok) {
              const imageBuffer = await imageRes.arrayBuffer();
              const filename = `ai-images/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.png`;
              await env.ASSETS_BUCKET.put(filename, imageBuffer, { 
                httpMetadata: { contentType: 'image/png' } 
              });
              // 生成 Cloudflare Pages 的访问 URL
              const storedUrl = `${url.origin}/files/${filename}`;
              // 记录到附件表
              await DB.prepare(`INSERT INTO attachments (user_id, filename, original_name, mime_type, size, storage_path, url) VALUES (?, ?, ?, ?, ?, ?, ?)`)
                .bind(user.user_id, filename, `AI生成图片-${Date.now()}.png`, 'image/png', imageBuffer.byteLength, filename, storedUrl).run();
              return json({ url: storedUrl, prompt, stored: true });
            }
          } catch (e) {
            console.error('保存图片到R2失败:', e);
            // 如果保存失败，返回原始URL
            return json({ url: imageUrl, prompt, stored: false });
          }
        }

        return json({ url: imageUrl, prompt, stored: false });
      } catch (e) {
        return error('图片生成失败: ' + e.message, 500);
      }
    }

    // ========== AI 文本生成文章 API ==========
    if (path === '/ai/generate' && method === 'POST') {
      const user = await verifyToken(token);
      if (!user) return error('需要登录', 401);
      const { idea_id, idea_content, image_prompts } = body;
      if (!idea_content) return error('请提供创意内容');

      // 如果提供了idea_id，从数据库获取category_id
      let category_id = null;
      if (idea_id) {
        const idea = await DB.prepare('SELECT category_id FROM ideas WHERE id = ? AND user_id = ?').bind(idea_id, user.user_id).first();
        if (idea) {
          category_id = idea.category_id;
        }
      }

      try {
        // 获取用户 AI 配置
        const aiConfig = await getUserAIConfig(user.user_id);
        
        if (!aiConfig.apiKey) {
          return error('AI服务未配置，请先设置 API Key', 503);
        }

        // 构建生成提示词
        const systemPrompt = `你是一个专业的自媒体文章写作专家。请根据用户提供的创意想法，生成一篇高质量的自媒体文章。

要求：
1. 文章标题吸引人，能引起读者兴趣
2. 内容有深度，避免空洞废话
3. 结构清晰，有小标题分段
4. 字数控制在800-1500字
5. 适当使用Markdown格式
6. 【重要】文章必须包含2-4张配图，在需要的位置用 [IMAGE:图片描述] 占位
7. 图片描述要具体，如：[IMAGE:科技感十足的智能手机展示图]

输出格式：
{
  "title": "文章标题",
  "summary": "文章摘要（100字以内）",
  "content": "文章完整内容（Markdown格式，必须包含2-4张[IMAGE:描述]图片占位符）",
  "tags": ["标签1", "标签2", "标签3"]
}`;

        const userPrompt = `请根据以下创意生成一篇文章：

${idea_content}

${image_prompts && image_prompts.length > 0 ? '\n建议配图描述：' + image_prompts.join('\n') : ''}`;

        // 调用 AI 生成
        const aiRes = await fetch(`${aiConfig.apiBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: aiConfig.temperature
          })
        });

        const aiData = await aiRes.json();
        if (!aiData.choices || !aiData.choices[0]) {
          return error('AI生成失败: ' + (aiData.error?.message || JSON.stringify(aiData)), 500);
        }

        const content = aiData.choices[0].message?.content;
        if (!content) {
          return error('AI生成失败: ' + (aiData.error?.message || '模型返回内容为空'), 500);
        }
        let parsed;
        try {
          // 尝试解析 JSON
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Not JSON');
          }
        } catch {
          // 如果不是JSON格式，手动解析
          const titleMatch = content.match(/title["\s:]+([^"\n]+)/);
          const summaryMatch = content.match(/summary["\s:]+([^"\n]+)/);
          parsed = {
            title: titleMatch ? titleMatch[1].trim() : idea_content.substring(0, 30),
            summary: summaryMatch ? summaryMatch[1].trim() : idea_content.substring(0, 100),
            content: content,
            tags: []
          };
        }

        // 创建文章
        const tempSlug = 'temp-' + Date.now();
        const tempResult = await DB.prepare('INSERT INTO articles (title, content, user_id, slug, status) VALUES (?, ?, ?, ?, ?)').bind(parsed.title || idea_content.substring(0, 30), parsed.content || idea_content, user.user_id, tempSlug, 'pending_review').run();
        const articleId = tempResult.meta.last_row_id;
        const slug = generateSlug(parsed.title || idea_content, articleId);

        // 处理图片占位符 [IMAGE:描述] → 生成实际图片
        let finalContent = parsed.content || idea_content;
        const imageMatches = finalContent.match(/\[IMAGE:([^\]]+)\]/g);
        if (imageMatches && imageMatches.length > 0) {
          console.log(`发现 ${imageMatches.length} 个图片占位符，开始生成...`);
          for (const match of imageMatches) {
            const prompt = match.replace('[IMAGE:', '').replace(']', '').trim();
            try {
              // 调用图片生成API
              let imageUrl = null;

              // 优先使用 SiliconFlow API
              const imgApiKey = env.IMAGE_API_KEY || 'sk-sapjibitygyiqnqfpcvjpaqpvprxnodwvdjmijvfobnyudap';
              const imgRes = await fetch('https://api.siliconflow.cn/v1/image/generations', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${imgApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'stabilityai/stable-diffusion-3-medium',
                  prompt: prompt,
                  image_size: '1024x1024'
                })
              });
              if (imgRes.ok) {
                const imgData = await imgRes.json();
                if (imgData.images && imgData.images[0]) {
                  imageUrl = imgData.images[0].url;
                }
              }

              // 备用：使用免费 Z-Image API
              if (!imageUrl) {
                try {
                  const zRes = await fetch('https://zimage.run/api/v1/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, width: 1024, height: 1024 })
                  });
                  if (zRes.ok) {
                    const zData = await zRes.json();
                    if (zData.image_url) {
                      imageUrl = zData.image_url;
                    }
                  }
                } catch (zErr) {
                  console.log('Z-Image API 不可用');
                }
              }

              if (imageUrl) {
                // 替换占位符为实际图片
                finalContent = finalContent.replace(match, `\n![${prompt}](${imageUrl})\n`);
                console.log(`图片生成成功: ${imageUrl}`);
              } else {
                // 图片生成失败，移除占位符
                finalContent = finalContent.replace(match, '');
                console.log(`图片生成失败，已移除占位符`);
              }
            } catch (imgErr) {
              console.error('生成图片异常:', imgErr);
              finalContent = finalContent.replace(match, '');
            }
            // 避免请求过快
            await new Promise(r => setTimeout(r, 500));
          }
        }

        // 更新文章内容（包含实际图片）
        await DB.prepare('UPDATE articles SET slug = ?, summary = ?, category_id = ?, content = ? WHERE id = ?').bind(slug, parsed.summary || null, category_id || null, finalContent, articleId).run();

        // 添加标签
        if (parsed.tags && parsed.tags.length > 0) {
          for (const tagName of parsed.tags) {
            let tag = await DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
            if (!tag) {
              const tagResult = await DB.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').bind(tagName, tagName.toLowerCase().replace(/\s+/g, '-')).run();
              tag = { id: tagResult.meta.last_row_id };
            }
            await DB.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)').bind(articleId, tag.id).run();
          }
        }

        // 更新创意状态
        if (idea_id) {
          await DB.prepare('UPDATE ideas SET status = ?, article_id = ? WHERE id = ?').bind('done', articleId, idea_id).run();
        }

        // 记录生成历史
        await DB.prepare(`INSERT INTO ai_generations (idea_id, article_id, user_id, prompt, model, result, status) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(idea_id || null, articleId, user.user_id, idea_content, aiConfig.model, content, 'success').run();

        return json({ 
          success: true, 
          article_id: articleId,
          title: parsed.title,
          slug 
        }, '文章生成成功');
      } catch (e) {
        // 记录失败（保护式写入，避免二次异常）
        try {
          await DB.prepare(`INSERT INTO ai_generations (idea_id, user_id, prompt, model, result, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(idea_id || null, user.user_id, idea_content, aiConfig.model, '', 'failed', e.message).run();
        } catch (dbErr) {
          console.error('记录AI生成失败日志时出错:', dbErr);
        }
        return error('生成失败: ' + e.message, 500);
      }
    }

    // ========== AI 批量生成文章 API（一键全部未生成） ==========
    if (path === '/ai/batch-generate' && method === 'POST') {
      const user = await verifyToken(token);
      if (!user) return error('需要登录', 401);

      // 获取所有待生成的 ideas
      const pendingIdeas = await DB.prepare('SELECT id, content, category_id, tags FROM ideas WHERE status = ? AND user_id = ?').bind('pending', user.user_id).all();
      
      if (pendingIdeas.results.length === 0) {
        return json({ success: true, message: '没有待生成的内容', results: [] });
      }

      // 获取用户 AI 配置
      const aiConfig = await getUserAIConfig(user.user_id);
      
      if (!aiConfig.apiKey) {
        return error('AI服务未配置，请先设置 API Key', 503);
      }

      const systemPrompt = `你是一个专业的自媒体文章写作专家。请根据用户提供的创意想法，生成一篇高质量的自媒体文章。

要求：
1. 文章标题吸引人，能引起读者兴趣
2. 内容有深度，避免空洞废话
3. 结构清晰，有小标题分段
4. 字数控制在800-1500字
5. 适当使用Markdown格式
6. 【重要】文章必须包含2-4张配图，在需要的位置用 [IMAGE:图片描述] 占位
7. 图片描述要具体，如：[IMAGE:科技感十足的智能手机展示图]

输出格式：
{
  "title": "文章标题",
  "summary": "文章摘要（100字以内）",
  "content": "文章完整内容（Markdown格式，必须包含2-4张[IMAGE:描述]图片占位符）",
  "tags": ["标签1", "标签2", "标签3"]
}`;

      const results = [];
      let successCount = 0;
      let failCount = 0;

      // 逐个生成（避免并发过多）
      for (const idea of pendingIdeas.results) {
        try {
          // 更新状态为生成中
          await DB.prepare('UPDATE ideas SET status = ? WHERE id = ?').bind('generating', idea.id).run();

          const userPrompt = `请根据以下创意生成一篇文章：

${idea.content}`;

          // 调用 AI 生成
          const aiRes = await fetch(`${aiConfig.apiBase}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${aiConfig.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: aiConfig.model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: aiConfig.temperature
            })
          });

          const aiData = await aiRes.json();
          if (!aiData.choices || !aiData.choices[0]) {
            throw new Error(aiData.error?.message || JSON.stringify(aiData));
          }

          const content = aiData.choices[0].message?.content;
          if (!content) {
            throw new Error('模型返回内容为空');
          }

          let parsed;
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('Not JSON');
            }
          } catch {
            const titleMatch = content.match(/title["\s:]+([^"\n]+)/);
            const summaryMatch = content.match(/summary["\s:]+([^"\n]+)/);
            parsed = {
              title: titleMatch ? titleMatch[1].trim() : idea.content.substring(0, 30),
              summary: summaryMatch ? summaryMatch[1].trim() : idea.content.substring(0, 100),
              content: content,
              tags: []
            };
          }

          // 创建文章
          const tempSlug = 'temp-' + Date.now();
          const tempResult = await DB.prepare('INSERT INTO articles (title, content, user_id, slug, status) VALUES (?, ?, ?, ?, ?)').bind(parsed.title || idea.content.substring(0, 30), parsed.content || idea.content, user.user_id, tempSlug, 'pending_review').run();
          const articleId = tempResult.meta.last_row_id;
          const slug = generateSlug(parsed.title || idea.content, articleId);

          // 处理图片占位符 [IMAGE:描述] → 生成实际图片
          let finalContent = parsed.content || idea.content;
          const imageMatches = finalContent.match(/\[IMAGE:([^\]]+)\]/g);
          if (imageMatches && imageMatches.length > 0) {
            for (const match of imageMatches) {
              const prompt = match.replace('[IMAGE:', '').replace(']', '').trim();
              try {
                let imageUrl = null;
                const imgApiKey = env.IMAGE_API_KEY || 'sk-sapjibitygyiqnqfpcvjpaqpvprxnodwvdjmijvfobnyudap';
                const imgRes = await fetch('https://api.siliconflow.cn/v1/image/generations', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${imgApiKey}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ model: 'stabilityai/stable-diffusion-3-medium', prompt, image_size: '1024x1024' })
                });
                if (imgRes.ok) {
                  const imgData = await imgRes.json();
                  if (imgData.images && imgData.images[0]) {
                    imageUrl = imgData.images[0].url;
                  }
                }
                if (!imageUrl) {
                  try {
                    const zRes = await fetch('https://zimage.run/api/v1/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt, width: 1024, height: 1024 })
                    });
                    if (zRes.ok) {
                      const zData = await zRes.json();
                      if (zData.image_url) imageUrl = zData.image_url;
                    }
                  } catch (zErr) {
                    console.log('Z-Image API 不可用');
                  }
                }
                if (imageUrl) {
                  finalContent = finalContent.replace(match, `\n![${prompt}](${imageUrl})\n`);
                } else {
                  finalContent = finalContent.replace(match, '');
                }
              } catch (imgErr) {
                console.error('生成图片异常:', imgErr);
                finalContent = finalContent.replace(match, '');
              }
              await new Promise(r => setTimeout(r, 500));
            }
          }

          // 更新文章内容（包含实际图片）
          await DB.prepare('UPDATE articles SET slug = ?, summary = ?, category_id = ?, content = ? WHERE id = ?').bind(slug, parsed.summary || null, idea.category_id || null, finalContent, articleId).run();

          // 添加标签
          if (parsed.tags && parsed.tags.length > 0) {
            for (const tagName of parsed.tags) {
              let tag = await DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
              if (!tag) {
                const tagResult = await DB.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').bind(tagName, tagName.toLowerCase().replace(/\s+/g, '-')).run();
                tag = { id: tagResult.meta.last_row_id };
              }
              await DB.prepare('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)').bind(articleId, tag.id).run();
            }
          }

          // 更新创意状态
          await DB.prepare('UPDATE ideas SET status = ?, article_id = ? WHERE id = ?').bind('done', articleId, idea.id).run();

          // 记录生成历史
          await DB.prepare(`INSERT INTO ai_generations (idea_id, article_id, user_id, prompt, model, result, status) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(idea.id, articleId, user.user_id, idea.content, aiConfig.model, content, 'success').run();

          results.push({ idea_id: idea.id, success: true, article_id: articleId, title: parsed.title });
          successCount++;
        } catch (e) {
          // 更新状态为失败
          await DB.prepare('UPDATE ideas SET status = ? WHERE id = ?').bind('pending', idea.id).run();
          
          // 记录失败
          try {
            await DB.prepare(`INSERT INTO ai_generations (idea_id, user_id, prompt, model, result, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(idea.id, user.user_id, idea.content, aiConfig.model, '', 'failed', e.message).run();
          } catch (dbErr) {
            console.error('记录AI生成失败日志时出错:', dbErr);
          }
          
          results.push({ idea_id: idea.id, success: false, error: e.message });
          failCount++;
        }
      }

      return json({
        success: true,
        message: `批量生成完成：成功 ${successCount} 个，失败 ${failCount} 个`,
        total: pendingIdeas.results.length,
        success_count: successCount,
        fail_count: failCount,
        results
      }, `完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    }

    // ========== AI 自动修复文章 ==========
    if (path === '/ai/fix' && method === 'POST') {
      const user = await verifyToken(token);
      if (!user) return error('需要登录', 401);
      const { article_id, comments } = body;
      if (!article_id) return error('请提供文章ID');

      try {
        const article = await DB.prepare('SELECT * FROM articles WHERE id = ?').bind(article_id).first();
        if (!article) return error('文章不存在', 404);

        // 获取未修复的评论
        const unresolvedComments = comments || await DB.prepare('SELECT * FROM comments WHERE article_id = ? AND fixed = 0 AND issue_type IS NOT NULL').bind(article_id).all();
        
        const issues = unresolvedComments.results?.map(c => `[${c.issue_type}]: ${c.content}`).join('\n') || '';

        const deepseekKey = env.DEEPSEEK_API_KEY;
        const qwenKey = env.QWEN_API_KEY;
        const aiKey = deepseekKey || qwenKey;
        
        if (!aiKey) {
          return error('AI服务未配置', 503);
        }

        const systemPrompt = `你是一个专业的自媒体文章编辑。请根据用户的反馈修改文章。

要求：
1. 保持文章整体结构和核心观点
2. 重点修改用户指出的问题
3. 如果涉及图片问题，可以在对应位置调整图片描述
4. 输出完整的修改后文章内容（Markdown格式）

输出格式：
{
  "title": "修改后的标题（如需修改）",
  "content": "修改后的完整文章",
  "summary": "修改后的摘要"
}`;

        const fixPrompt = `请修改以下文章，用户的反馈如下：

文章标题：${article.title}
文章内容：
${article.content}

用户反馈：
${issues}

请根据反馈修改文章，只输出修改后的内容。`;

        const apiBase = deepseekKey ? 'https://api.siliconflow.cn/v1' : 'https://api.siliconflow.cn/v1';
        const model = deepseekKey ? 'deepseek-ai/DeepSeek-V3' : 'Qwen/Qwen2.5-72B-Instruct';

        const aiRes = await fetch(`${apiBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: fixPrompt }
            ],
            temperature: 0.5
          })
        });

        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content || '';

        // 保存修订历史
        const revisionNum = await DB.prepare('SELECT COUNT(*) as c FROM article_revisions WHERE article_id = ?').bind(article_id).first();
        await DB.prepare(`INSERT INTO article_revisions (article_id, revision_number, content, summary, cover_image, comment, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(article_id, (revisionNum?.c || 0) + 1, article.content, article.summary, article.cover_image, 'AI自动修复', user.user_id).run();

        // 更新文章
        let parsed;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        } catch {}

        await DB.prepare(`UPDATE articles SET content = ?, updated_at = datetime('now'), status = 'pending_review', need_regenerate = 0 WHERE id = ?`).bind(parsed?.content || content, article_id).run();
        if (parsed?.title) {
          await DB.prepare('UPDATE articles SET title = ? WHERE id = ?').bind(parsed.title, article_id).run();
        }

        // 标记评论为已修复
        if (unresolvedComments.results?.length > 0) {
          for (const c of unresolvedComments.results) {
            await DB.prepare('UPDATE comments SET fixed = 1 WHERE id = ?').bind(c.id).run();
          }
        }

        return json({ success: true, article_id });
      } catch (e) {
        return error('修复失败: ' + e.message, 500);
      }
    }

    try {
      // Stats - 完整统计
      if (path === '/stats' && method === 'GET') {
        const userId = await getUserIdFromToken(token);
        
        // 文章统计
        const totalArticles = await DB.prepare('SELECT COUNT(*) as c FROM articles').first();
        const publishedArticles = await DB.prepare("SELECT COUNT(*) as c FROM articles WHERE status = 'published'").first();
        const draftArticles = await DB.prepare("SELECT COUNT(*) as c FROM articles WHERE status = 'draft'").first();
        const pendingReviewArticles = await DB.prepare("SELECT COUNT(*) as c FROM articles WHERE status = 'pending_review'").first();
        const totalViews = await DB.prepare('SELECT SUM(view_count) as t FROM articles').first();
        
        // 用户创作统计（手动创建的文章）
        const userArticles = await DB.prepare('SELECT COUNT(*) as c FROM articles WHERE user_id = ?').bind(userId).first();
        
        // AI 生成统计
        const aiGenerations = await DB.prepare('SELECT COUNT(*) as c FROM ai_generations WHERE user_id = ?').bind(userId).first();
        const aiSuccess = await DB.prepare("SELECT COUNT(*) as c FROM ai_generations WHERE user_id = ? AND status = 'success'").bind(userId).first();
        const aiFailed = await DB.prepare("SELECT COUNT(*) as c FROM ai_generations WHERE user_id = ? AND status = 'failed'").bind(userId).first();
        
        // 创意统计
        const totalIdeas = await DB.prepare('SELECT COUNT(*) as c FROM ideas WHERE user_id = ?').bind(userId).first();
        const pendingIdeas = await DB.prepare("SELECT COUNT(*) as c FROM ideas WHERE user_id = ? AND status = 'pending'").bind(userId).first();
        const doneIdeas = await DB.prepare("SELECT COUNT(*) as c FROM ideas WHERE user_id = ? AND status = 'done'").bind(userId).first();
        
        // AI 使用 Token 统计
        const aiTokens = await DB.prepare('SELECT SUM(tokens_used) as t FROM ai_generations WHERE user_id = ?').bind(userId).first();
        const aiCost = await DB.prepare('SELECT SUM(cost) as t FROM ai_generations WHERE user_id = ?').bind(userId).first();
        
        // 最近失败记录（用于显示错误）
        const recentErrors = await DB.prepare(`
          SELECT g.id, g.idea_id, g.prompt, g.error_message, g.created_at,
                 i.content as idea_content
          FROM ai_generations g
          LEFT JOIN ideas i ON g.idea_id = i.id
          WHERE g.user_id = ? AND g.status = 'failed'
          ORDER BY g.created_at DESC
          LIMIT 10
        `).bind(userId).all();
        
        // 分类和标签
        const categories = await DB.prepare('SELECT COUNT(*) as c FROM categories').first();
        const tags = await DB.prepare('SELECT COUNT(*) as c FROM tags').first();
        
        return json({
          success: true,
          articles: {
            total: totalArticles?.c || 0,
            published: publishedArticles?.c || 0,
            draft: draftArticles?.c || 0,
            pending_review: pendingReviewArticles?.c || 0,
            user_created: userArticles?.c || 0
          },
          views: totalViews?.t || 0,
          ai: {
            total_generations: aiGenerations?.c || 0,
            success: aiSuccess?.c || 0,
            failed: aiFailed?.c || 0,
            tokens_used: aiTokens?.t || 0,
            cost: aiCost?.t || 0
          },
          ideas: {
            total: totalIdeas?.c || 0,
            pending: pendingIdeas?.c || 0,
            done: doneIdeas?.c || 0
          },
          categories: categories?.c || 0,
          tags: tags?.c || 0,
          errors: recentErrors.results || []
        });
      }

      // ========== AI 配置 API（多配置版本）==========
      // 获取所有 AI 配置列表
      if (path === '/ai/config' && method === 'GET') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        
        const configs = await DB.prepare('SELECT * FROM ai_config WHERE user_id = ? ORDER BY is_default DESC, id ASC').bind(user.user_id).all();
        
        // 格式化返回，隐藏完整 API Key
        const data = configs.results.map(c => ({
          id: c.id,
          name: c.name,
          provider: c.provider,
          model: c.model,
          api_key: c.api_key ? '****' + c.api_key.slice(-4) : '',
          api_base: c.api_base,
          temperature: c.temperature,
          max_tokens: c.max_tokens,
          is_default: c.is_default === 1
        }));
        
        return json({ success: true, data });
      }
      
      // 创建新 AI 配置
      if (path === '/ai/config' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        
        const { name, provider, model, api_key, api_base, temperature, max_tokens } = body;
        
        if (!name) return error('配置名称不能为空');
        if (!provider || !model) return error('提供商和模型不能为空');
        
        // 检查名称是否重复
        const existing = await DB.prepare('SELECT id FROM ai_config WHERE user_id = ? AND name = ?').bind(user.user_id, name).first();
        if (existing) return error('配置名称已存在');
        
        // 如果设为默认，先取消其他默认
        const { is_default } = body;
        if (is_default) {
          await DB.prepare('UPDATE ai_config SET is_default = 0 WHERE user_id = ?').bind(user.user_id).run();
        }
        
        await DB.prepare(`
          INSERT INTO ai_config (user_id, name, provider, model, api_key, api_base, temperature, max_tokens, is_default)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(user.user_id, name, provider, model, api_key || null, api_base || 'https://api.siliconflow.cn/v1', temperature || 0.7, max_tokens || 2000, is_default ? 1 : 0).run();
        
        return success({ message: '配置创建成功' });
      }
      
      // 更新 AI 配置
      if (path === '/ai/config/update' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        
        const { id, name, provider, model, api_key, api_base, temperature, max_tokens } = body;
        
        if (!id) return error('配置ID不能为空');
        if (!name) return error('配置名称不能为空');
        
        // 验证配置归属
        const config = await DB.prepare('SELECT id, api_key as old_key FROM ai_config WHERE id = ? AND user_id = ?').bind(id, user.user_id).first();
        if (!config) return error('配置不存在或无权修改');
        
        // 检查名称是否被其他配置使用
        const nameConflict = await DB.prepare('SELECT id FROM ai_config WHERE user_id = ? AND name = ? AND id != ?').bind(user.user_id, name, id).first();
        if (nameConflict) return error('配置名称已被使用');
        
        // 如果 API Key 显示为掩码，保持原有 Key
        const finalApiKey = (api_key && api_key.startsWith('****')) ? config.old_key : api_key;
        
        await DB.prepare(`
          UPDATE ai_config SET name = ?, provider = ?, model = ?, api_key = ?, api_base = ?, temperature = ?, max_tokens = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(name, provider, model, finalApiKey || null, api_base || 'https://api.siliconflow.cn/v1', temperature || 0.7, max_tokens || 2000, id).run();
        
        return success({ message: '配置更新成功' });
      }
      
      // 删除 AI 配置
      if (path === '/ai/config/delete' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        
        const { id } = body;
        if (!id) return error('配置ID不能为空');
        
        const config = await DB.prepare('SELECT id, is_default FROM ai_config WHERE id = ? AND user_id = ?').bind(id, user.user_id).first();
        if (!config) return error('配置不存在');
        
        await DB.prepare('DELETE FROM ai_config WHERE id = ?').bind(id).run();
        
        // 如果删除的是默认配置，将第一个配置设为默认
        if (config.is_default) {
          const first = await DB.prepare('SELECT id FROM ai_config WHERE user_id = ? ORDER BY id ASC LIMIT 1').bind(user.user_id).first();
          if (first) {
            await DB.prepare('UPDATE ai_config SET is_default = 1 WHERE id = ?').bind(first.id).run();
          }
        }
        
        return success({ message: '配置已删除' });
      }
      
      // 设置默认配置
      if (path === '/ai/config/default' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        
        const { id } = body;
        if (!id) return error('配置ID不能为空');
        
        const config = await DB.prepare('SELECT id FROM ai_config WHERE id = ? AND user_id = ?').bind(id, user.user_id).first();
        if (!config) return error('配置不存在');
        
        await DB.prepare('UPDATE ai_config SET is_default = 0 WHERE user_id = ?').bind(user.user_id).run();
        await DB.prepare('UPDATE ai_config SET is_default = 1 WHERE id = ?').bind(id).run();
        
        return success({ message: '已设为默认配置' });
      }

      // Categories
      if (path === '/categories' && method === 'GET') {
        const categories = await DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
        return json({ success: true, data: categories.results });
      }

      // Create category
      if (path === '/categories' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const { name, description } = body;
        if (!name) return error('分类名称不能为空');
        const existing = await DB.prepare('SELECT id FROM categories WHERE name = ?').bind(name).first();
        if (existing) return error('分类名称已存在');
        const result = await DB.prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)').bind(name, name, description || null, 0).run();
        return success({ id: result.meta.last_row_id }, '分类创建成功');
      }

      // Update category
      const catMatch = path.match(/^\/category\/(\d+)$/);
      if (catMatch && method === 'PUT') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = catMatch[1];
        const { name, description, sort_order } = body;
        await DB.prepare('UPDATE categories SET name = COALESCE(?, name), slug = COALESCE(?, slug), description = COALESCE(?, description), sort_order = COALESCE(?, sort_order) WHERE id = ?').bind(name, name, description, sort_order, id).run();
        return success(null, '分类更新成功');
      }

      // Delete category
      if (catMatch && method === 'DELETE') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = catMatch[1];
        // 先把引用该分类的文章和创意的 category_id 设为 null
        await DB.prepare('UPDATE articles SET category_id = NULL WHERE category_id = ?').bind(id).run();
        await DB.prepare('UPDATE ideas SET category_id = NULL WHERE category_id = ?').bind(id).run();
        // 再删除分类
        await DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
        return success(null, '分类删除成功');
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
        if (category) { where += " AND c.name = ?"; bindings.push(category); }
        if (keyword) { where += " AND (a.title LIKE ? OR a.content LIKE ?)"; bindings.push(`%${keyword}%`, `%${keyword}%`); }

        const countResult = await DB.prepare(`SELECT COUNT(*) as total FROM articles a LEFT JOIN categories c ON a.category_id = c.id ${where}`).bind(...bindings).first();
        const articles = await DB.prepare(`SELECT a.*, c.name as category_name, c.slug as category_slug, u.username as author_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id LEFT JOIN users u ON a.user_id = u.id ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all();

        return json({ articles: articles.results, total: countResult.total, page, limit, totalPages: Math.ceil(countResult.total / limit) });
      }

      // Article detail - 支持 slug 或 id
      const articleMatch = path.match(/^\/article\/([^/]+)$/);
      if (articleMatch && method === 'GET') {
        const identifier = articleMatch[1];
        let article;
        // 尝试用 id 查询（数字）
        if (/^\d+$/.test(identifier)) {
          article = await DB.prepare(`SELECT a.*, c.name as category_name, c.slug as category_slug, u.username as author_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id LEFT JOIN users u ON a.user_id = u.id WHERE a.id = ?`).bind(parseInt(identifier)).first();
        }
        // 如果没找到，尝试用 slug 查询
        if (!article) {
          article = await DB.prepare(`SELECT a.*, c.name as category_name, c.slug as category_slug, u.username as author_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id LEFT JOIN users u ON a.user_id = u.id WHERE a.slug = ?`).bind(identifier).first();
        }
        if (!article) return error('文章不存在', 404);
        await DB.prepare('UPDATE articles SET view_count = view_count + 1 WHERE id = ?').bind(article.id).run();
        const tags = await DB.prepare(`SELECT t.* FROM tags t JOIN article_tags at ON t.id = at.tag_id WHERE at.article_id = ?`).bind(article.id).all();
        article.tags = tags.results;
        return json({ success: true, data: article });
      }

      // Search
      if (path === '/search' && method === 'GET') {
        const keyword = url.searchParams.get('keyword');
        if (!keyword) return error('请输入搜索关键词');
        const articles = await DB.prepare(`SELECT a.*, c.name as category_name, u.username as author_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id LEFT JOIN users u ON a.user_id = u.id WHERE a.status = 'published' AND (a.title LIKE ? OR a.content LIKE ?) ORDER BY a.created_at DESC LIMIT 50`).bind(`%${keyword}%`, `%${keyword}%`).all();
        return json({ success: true, data: articles.results });
      }

      // Tags
      if (path === '/tags' && method === 'GET') {
        const tags = await DB.prepare('SELECT t.*, COUNT(at.article_id) as article_count FROM tags t LEFT JOIN article_tags at ON t.id = at.tag_id GROUP BY t.id ORDER BY article_count DESC').all();
        return json({ success: true, data: tags.results });
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
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
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
        const articles = await DB.prepare(`SELECT a.id, a.title, a.summary, a.cover_image, a.category_id, a.status, a.view_count, a.created_at, a.updated_at, c.name as category_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all();
        return json({ articles: articles.results, total: countResult.total, page, limit });
      }

      // Create article
      if (path === '/articles' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const { title, content, summary, category_id, cover_image, tags, status } = body;
        if (!title || !content) return error('标题和内容不能为空');
        // 先生成临时 slug（用时间戳+随机数），插入后再用 id 更新
        const tempSlug = 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
        const tempResult = await DB.prepare('INSERT INTO articles (title, content, user_id, slug) VALUES (?, ?, ?, ?)').bind(title, content, user.user_id, tempSlug).run();
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
        // Convert undefined to null for SQL binding
        const safeBind = (v) => v === undefined ? null : v;
        await DB.prepare(`UPDATE articles SET title = COALESCE(?, title), content = COALESCE(?, content), summary = COALESCE(?, summary), category_id = COALESCE(?, category_id), cover_image = COALESCE(?, cover_image), status = COALESCE(?, status), updated_at = datetime('now'), published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN datetime('now') ELSE published_at END WHERE id = ?`).bind(safeBind(title), safeBind(content), safeBind(summary), safeBind(category_id), safeBind(cover_image), safeBind(status), safeBind(status), id).run();
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

      // ========== 评论相关 ==========

      // 获取文章评论列表
      const commentsMatch = path.match(/^\/comments\/(\d+)$/);
      if (commentsMatch && method === 'GET') {
        const articleId = commentsMatch[1];
        const includeAll = url.searchParams.get('all') === 'true';
        const whereClause = includeAll ? '' : " AND c.status = 'approved'";
        const comments = await DB.prepare(`
          SELECT c.*, u.username, u.avatar
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.article_id = ?${whereClause}
          ORDER BY c.created_at DESC
        `).bind(articleId).all();
        return json({ success: true, data: comments.results });
      }

      // 发表评论（支持问题标记）
      if (path === '/comments' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const { article_id, content, parent_id, issue_type } = body;
        if (!article_id || !content || !content.trim()) return error('文章ID和评论内容不能为空');
        const article = await DB.prepare('SELECT id FROM articles WHERE id = ?').bind(article_id).first();
        if (!article) return error('文章不存在', 404);
        
        // 如果标记了问题类型，文章状态改为 need_fix
        if (issue_type) {
          await DB.prepare("UPDATE articles SET status = 'need_fix', need_regenerate = 1 WHERE id = ?").bind(article_id).run();
          // 创建AI修复任务
          await DB.prepare(`INSERT INTO tasks (user_id, assignee, title, task_type, related_article_id, priority) VALUES (?, 'ai', ?, 'fix_article', ?, 8)`).bind(user.user_id, `修复文章问题: ${issue_type}`, article_id).run();
        }
        
        const result = await DB.prepare('INSERT INTO comments (article_id, user_id, parent_id, content, status, issue_type) VALUES (?, ?, ?, ?, ?, ?)').bind(article_id, user.user_id, parent_id || null, content.trim(), issue_type ? 'approved' : 'approved', issue_type || null).run();
        return success({ id: result.meta.last_row_id }, '评论发表成功');
      }

      // 更新评论状态（标记问题已修复）
      if (path === '/comments/fix' && method === 'PUT') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const { comment_id, fixed } = body;
        if (!comment_id) return error('请提供评论ID');
        await DB.prepare('UPDATE comments SET fixed = ? WHERE id = ?').bind(fixed ? 1 : 0, comment_id).run();
        return success(null, '评论状态已更新');
      }

      // 删除评论
      const commentDeleteMatch = path.match(/^\/comments\/(\d+)$/);
      if (commentDeleteMatch && method === 'DELETE') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const commentId = commentDeleteMatch[1];
        const comment = await DB.prepare('SELECT c.*, a.user_id as article_author_id FROM comments c JOIN articles a ON c.article_id = a.id WHERE c.id = ?').bind(commentId).first();
        if (!comment) return error('评论不存在', 404);
        // 评论作者或文章作者可删除
        if (comment.user_id !== user.user_id && comment.article_author_id !== user.user_id) {
          return error('无权删除此评论', 403);
        }
        await DB.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();
        return success(null, '评论删除成功');
      }

      // ========== 创意想法 API ==========
      
      // 获取创意列表
      if (path === '/ideas' && method === 'GET') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const status = url.searchParams.get('status');
        let where = 'WHERE i.user_id = ?';
        const bindings = [user.user_id];
        if (status) { where += ' AND i.status = ?'; bindings.push(status); }
        const ideas = await DB.prepare(`SELECT i.*, a.title as article_title, a.id as article_id, c.name as category_name, c.slug as category_slug FROM ideas i LEFT JOIN articles a ON i.article_id = a.id LEFT JOIN categories c ON i.category_id = c.id ${where} ORDER BY i.priority DESC, i.created_at DESC`).bind(...bindings).all();
        return json({ success: true, data: ideas.results });
      }

      // 创建创意
      if (path === '/ideas' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const { content, source, priority, tags, category_id } = body;
        if (!content || !content.trim()) return error('创意内容不能为空');
        const result = await DB.prepare('INSERT INTO ideas (user_id, content, source, priority, tags, category_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(user.user_id, content.trim(), source || 'manual', priority || 0, tags || null, category_id || null, 'pending').run();
        const ideaId = result.meta.last_row_id;
        // 自动创建AI任务
        await DB.prepare(`INSERT INTO tasks (user_id, assignee, title, task_type, related_idea_id, priority) VALUES (?, 'ai', ?, 'generate_article', ?, ?)`).bind(user.user_id, `生成文章: ${content.substring(0, 20)}...`, ideaId, priority || 5).run();
        return success({ id: ideaId }, '创意已添加，AI将自动生成文章');
      }

      // 更新创意
      const ideaMatch = path.match(/^\/idea\/(\d+)$/);
      if (ideaMatch && method === 'PUT') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = ideaMatch[1];
        const { content, priority, status, tags } = body;
        const safeBind = (v) => v === undefined ? null : v;
        await DB.prepare(`UPDATE ideas SET content = COALESCE(?, content), priority = COALESCE(?, priority), status = COALESCE(?, status), tags = COALESCE(?, tags), updated_at = datetime('now') WHERE id = ? AND user_id = ?`).bind(safeBind(content), safeBind(priority), safeBind(status), safeBind(tags), id, user.user_id).run();
        return success(null, '创意已更新');
      }

      // 删除创意
      if (ideaMatch && method === 'DELETE') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = ideaMatch[1];
        await DB.prepare('DELETE FROM ideas WHERE id = ? AND user_id = ?').bind(id, user.user_id).run();
        return success(null, '创意已删除');
      }

      // ========== 待办任务 API ==========

      // 获取待办列表
      if (path === '/tasks' && method === 'GET') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const assignee = url.searchParams.get('assignee'); // user, ai, all
        const status = url.searchParams.get('status');
        let where = 'WHERE t.user_id = ?';
        const bindings = [user.user_id];
        if (assignee && assignee !== 'all') { where += ' AND t.assignee = ?'; bindings.push(assignee); }
        if (status) { where += ' AND t.status = ?'; bindings.push(status); }
        const tasks = await DB.prepare(`SELECT t.*, a.title as article_title, i.content as idea_content FROM tasks t LEFT JOIN articles a ON t.related_article_id = a.id LEFT JOIN ideas i ON t.related_idea_id = i.id ${where} ORDER BY t.priority DESC, t.created_at ASC`).bind(...bindings).all();
        return json({ success: true, data: tasks.results });
      }

      // 创建待办
      if (path === '/tasks' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const { title, description, task_type, assignee, priority, related_article_id, related_idea_id } = body;
        if (!title) return error('待办标题不能为空');
        const result = await DB.prepare('INSERT INTO tasks (user_id, title, description, task_type, assignee, priority, related_article_id, related_idea_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(user.user_id, title, description || null, task_type || 'other', assignee || 'user', priority || 5, related_article_id || null, related_idea_id || null).run();
        return success({ id: result.meta.last_row_id }, '待办已创建');
      }

      // 更新待办状态
      const taskMatch = path.match(/^\/task\/(\d+)$/);
      if (taskMatch && method === 'PUT') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = taskMatch[1];
        const { status, title, priority } = body;
        const safeBind = (v) => v === undefined ? null : v;
        await DB.prepare(`UPDATE tasks SET status = COALESCE(?, status), title = COALESCE(?, title), priority = COALESCE(?, priority), updated_at = datetime('now'), completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE NULL END WHERE id = ? AND user_id = ?`).bind(safeBind(status), safeBind(title), safeBind(priority), safeBind(status), id, user.user_id).run();
        return success(null, '待办已更新');
      }

      // 删除待办
      if (taskMatch && method === 'DELETE') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = taskMatch[1];
        await DB.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').bind(id, user.user_id).run();
        return success(null, '待办已删除');
      }

      // ========== 文章审核相关 ==========

      // 获取待审核文章
      if (path === '/pending-review' && method === 'GET') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const articles = await DB.prepare(`SELECT a.*, c.name as category_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.status = 'pending_review' ORDER BY a.created_at DESC`).bind().all();
        return json({ success: true, data: articles.results });
      }

      // 审核文章（通过/拒绝）
      if (path === '/article/review' && method === 'POST') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const { article_id, action } = body;
        if (!article_id || !action) return error('请提供文章ID和操作');
        
        if (action === 'approve') {
          await DB.prepare("UPDATE articles SET status = 'published', published_at = datetime('now') WHERE id = ?").bind(article_id).run();
          return success(null, '文章已发布');
        } else if (action === 'reject') {
          await DB.prepare("UPDATE articles SET status = 'need_fix' WHERE id = ?").bind(article_id).run();
          return success(null, '文章已退回修改');
        }
        return error('无效的操作');
      }

      // ========== 一键导出 ==========
      if (path === '/export' && method === 'GET') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        
        // 导出所有文章
        const articles = await DB.prepare('SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC').bind(user.user_id).all();
        // 导出所有创意
        const ideas = await DB.prepare('SELECT * FROM ideas WHERE user_id = ? ORDER BY created_at DESC').bind(user.user_id).all();
        // 导出所有附件
        const attachments = await DB.prepare('SELECT * FROM attachments WHERE user_id = ? ORDER BY created_at DESC').bind(user.user_id).all();
        // 导出所有待办
        const tasks = await DB.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').bind(user.user_id).all();
        
        const exportData = {
          export_time: new Date().toISOString(),
          version: '1.0',
          user_id: user.user_id,
          articles: articles.results,
          ideas: ideas.results,
          attachments: attachments.results,
          tasks: tasks.results
        };
        
        // 生成 JSON 文件
        const jsonStr = JSON.stringify(exportData, null, 2);
        
        return new Response(jsonStr, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="wenzhang-export-${Date.now()}.json"`,
            ...corsHeaders
          }
        });
      }

      // 获取附件列表
      if (path === '/attachments' && method === 'GET') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const attachments = await DB.prepare('SELECT * FROM attachments WHERE user_id = ? ORDER BY created_at DESC').bind(user.user_id).all();
        // 处理R2存储的URL
        const processedResults = (attachments.results || []).map(a => {
          if (a.storage_path && !a.url.startsWith('http')) {
            a.url = `${url.origin}/files/${a.storage_path}`;
          }
          return a;
        });
        return json({ success: true, data: processedResults });
      }

      // 下载/查看附件
      const attachmentMatch = path.match(/^\/attachment\/(\d+)$/);
      if (attachmentMatch && method === 'GET') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = attachmentMatch[1];
        const attachment = await DB.prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?').bind(id, user.user_id).first();
        if (!attachment) return error('附件不存在', 404);
        
        // R2存储：直接返回访问URL
        if (attachment.storage_path && attachment.storage_path.startsWith('uploads/') || attachment.storage_path.startsWith('ai-images/')) {
          return json({ url: `${url.origin}/files/${attachment.storage_path}`, filename: attachment.original_name });
        }
        
        return json({ url: attachment.url, filename: attachment.original_name });
      }

      // 删除附件
      if (attachmentMatch && method === 'DELETE') {
        const user = await verifyToken(token);
        if (!user) return error('需要登录', 401);
        const id = attachmentMatch[1];
        const attachment = await DB.prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?').bind(id, user.user_id).first();
        if (!attachment) return error('附件不存在', 404);
        
        // 删除R2中的文件
        if (env.ASSETS_BUCKET && attachment.storage_path.startsWith('uploads/') || attachment.storage_path.startsWith('ai-images/')) {
          try {
            await env.ASSETS_BUCKET.delete(attachment.storage_path);
          } catch (e) {
            console.error('删除R2文件失败:', e);
          }
        }
        
        // 删除数据库记录
        await DB.prepare('DELETE FROM attachments WHERE id = ?').bind(id).run();
        return success(null, '附件已删除');
      }

      // ========== AI 自动化检测 API (供 Cron 或登录用户调用) ==========
      if (path === '/ai/automation' && method === 'POST') {
        // 验证：自动化密钥 或 登录用户
        const autoKey = request.headers.get('X-Auto-Key');
        const authUser = await verifyToken(token);
        if (autoKey !== env.AUTO_KEY && !authUser) {
          return error('请先登录或提供自动化密钥', 401);
        }

        // 获取用户ID（优先使用登录用户，否则默认1）
        const userId = authUser?.user_id || 1;

        const results = { processed: 0, created: 0, fixed: 0 };

        // 1. 检测有未修复问题的文章
        const needFixArticles = await DB.prepare(`
          SELECT DISTINCT a.id, a.title, COUNT(c.id) as issue_count
          FROM articles a
          JOIN comments c ON a.id = c.article_id
          WHERE a.status = 'need_fix' AND c.fixed = 0 AND c.issue_type IS NOT NULL
          GROUP BY a.id
        `).all();
        
        for (const article of needFixArticles.results || []) {
          // 确保有AI修复任务
          const existingTask = await DB.prepare(`SELECT id FROM tasks WHERE related_article_id = ? AND assignee = 'ai' AND status = 'pending' AND task_type = 'fix_article'`).bind(article.id).first();
          if (!existingTask) {
            await DB.prepare(`INSERT INTO tasks (user_id, assignee, title, task_type, related_article_id, priority) VALUES (?, 'ai', ?, 'fix_article', ?, 9)`).bind(userId, `修复文章问题 (${article.issue_count}个)`, article.id).run();
            results.created++;
          }
          results.processed++;
        }

        // 2. 检测待生成的创意
        const pendingIdeas = await DB.prepare(`SELECT id, content, priority FROM ideas WHERE status = 'pending' ORDER BY priority DESC LIMIT 10`).all();
        for (const idea of pendingIdeas.results || []) {
          const existingTask = await DB.prepare(`SELECT id FROM tasks WHERE related_idea_id = ? AND assignee = 'ai' AND status = 'pending' AND task_type = 'generate_article'`).bind(idea.id).first();
          if (!existingTask) {
            await DB.prepare(`INSERT INTO tasks (user_id, assignee, title, task_type, related_idea_id, priority) VALUES (?, 'ai', ?, 'generate_article', ?, ?)`).bind(userId, `生成文章: ${idea.content.substring(0, 20)}...`, idea.id, idea.priority).run();
            results.created++;
          }
        }

        // 3. 自动处理待办任务（如果有AI Key）
        const deepseekKey = env.DEEPSEEK_API_KEY;
        
        // 即使没有AI Key，也标记任务为已完成（避免重复处理）
        if (!deepseekKey) {
          await DB.prepare(`UPDATE tasks SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE assignee = 'ai' AND status = 'pending'`).run();
          return json({ 
            success: true, 
            data: { ...results, message: 'AI Key未配置，任务已跳过' } 
          });
        }
        
        try {
          const aiTasks = await DB.prepare(`SELECT t.*, i.content as idea_content FROM tasks t LEFT JOIN ideas i ON t.related_idea_id = i.id WHERE t.assignee = 'ai' AND t.status = 'pending' ORDER BY t.priority DESC LIMIT 5`).all();
          
          for (const task of aiTasks.results || []) {
            await DB.prepare(`UPDATE tasks SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`).bind(task.id).run();
            
            if (task.task_type === 'generate_article' && task.idea_content) {
              // 调用 AI 生成文章
              const apiBase = 'https://api.siliconflow.cn/v1';
              const aiRes = await fetch(`${apiBase}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${deepseekKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'deepseek-ai/DeepSeek-V3',
                  messages: [
                    { role: 'system', content: '你是专业自媒体写作助手，生成800-1500字优质文章，Markdown格式，需要配图位置用[IMAGE:描述]占位。' },
                    { role: 'user', content: `根据以下创意写一篇文章：${task.idea_content}` }
                  ]
                })
              });
              
              const aiData = await aiRes.json();
              if (aiData.choices?.[0]?.message?.content) {
                let content = aiData.choices[0].message.content;
                
                // 处理图片占位符 [IMAGE:描述] → 生成实际图片
                const imageMatches = content.match(/\[IMAGE:([^\]]+)\]/g);
                if (imageMatches && imageMatches.length > 0) {
                  console.log(`[自动化任务] 发现 ${imageMatches.length} 个图片占位符`);
                  for (const match of imageMatches) {
                    const prompt = match.replace('[IMAGE:', '').replace(']', '').trim();
                    try {
                      let imageUrl = null;
                      const imgApiKey = env.IMAGE_API_KEY || 'sk-sapjibitygyiqnqfpcvjpaqpvprxnodwvdjmijvfobnyudap';
                      const imgRes = await fetch('https://api.siliconflow.cn/v1/image/generations', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${imgApiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: 'stabilityai/stable-diffusion-3-medium', prompt, image_size: '1024x1024' })
                      });
                      if (imgRes.ok) {
                        const imgData = await imgRes.json();
                        if (imgData.images && imgData.images[0]) {
                          imageUrl = imgData.images[0].url;
                        }
                      }
                      if (!imageUrl) {
                        try {
                          const zRes = await fetch('https://zimage.run/api/v1/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt, width: 1024, height: 1024 })
                          });
                          if (zRes.ok) {
                            const zData = await zRes.json();
                            if (zData.image_url) imageUrl = zData.image_url;
                          }
                        } catch (zErr) {}
                      }
                      if (imageUrl) {
                        content = content.replace(match, `\n![${prompt}](${imageUrl})\n`);
                      } else {
                        content = content.replace(match, '');
                      }
                    } catch (imgErr) {
                      content = content.replace(match, '');
                    }
                    await new Promise(r => setTimeout(r, 500));
                  }
                }
                
                const tempSlug = 'temp-' + Date.now();
                // 获取idea的category_id作为文章分类
                const idea = await DB.prepare('SELECT category_id FROM ideas WHERE id = ?').bind(task.related_idea_id).first();
                const ideaCategoryId = idea?.category_id || null;
                const tempResult = await DB.prepare('INSERT INTO articles (title, content, user_id, slug, status, category_id) VALUES (?, ?, ?, ?, ?, ?)').bind('AI生成文章', content, userId, tempSlug, 'pending_review', ideaCategoryId).run();
                const articleId = tempResult.meta.last_row_id;
                const slug = generateSlug('AI生成文章', articleId);
                await DB.prepare('UPDATE articles SET slug = ? WHERE id = ?').bind(slug, articleId).run();
                await DB.prepare('UPDATE ideas SET status = ?, article_id = ? WHERE id = ?').bind('done', articleId, task.related_idea_id).run();
              }
            } else if (task.task_type === 'fix_article') {
              // 获取需要修复的文章和评论
              const article = await DB.prepare('SELECT * FROM articles WHERE id = ?').bind(task.related_article_id).first();
              const comments = await DB.prepare('SELECT * FROM comments WHERE article_id = ? AND fixed = 0 AND issue_type IS NOT NULL').bind(task.related_article_id).all();
              
              if (article && comments.results?.length > 0) {
                const issues = comments.results.map(c => `[${c.issue_type}]: ${c.content}`).join('\n');
                const apiBase = 'https://api.siliconflow.cn/v1';
                const aiRes = await fetch(`${apiBase}/chat/completions`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${deepseekKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model: 'deepseek-ai/DeepSeek-V3',
                    messages: [
                      { role: 'system', content: '你是一个文章编辑，根据用户反馈修改文章。输出JSON: {content: 修改后的文章}' },
                      { role: 'user', content: `文章：\n${article.content}\n\n反馈：\n${issues}\n\n请修改文章` }
                    ]
                  })
                });
                
                const aiData = await aiRes.json();
                if (aiData.choices?.[0]?.message?.content) {
                  const jsonMatch = aiData.choices[0].message.content.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    await DB.prepare('UPDATE articles SET content = ?, status = ? WHERE id = ?').bind(parsed.content, 'pending_review', article.id).run();
                    for (const c of comments.results) {
                      await DB.prepare('UPDATE comments SET fixed = 1 WHERE id = ?').bind(c.id).run();
                    }
                    results.fixed++;
                  }
                }
              }
            }
            
            await DB.prepare(`UPDATE tasks SET status = 'completed', completed_at = datetime('now') WHERE id = ?`).bind(task.id).run();
            results.processed++;
          }
        } catch (aiError) {
          console.error('AI处理错误:', aiError);
          // AI处理失败，不影响整体返回
        }

        return json({ success: true, data: results });
      }

      return error('API不存在', 404);
    } catch (e) {
      console.error(e);
      return error('服务器错误: ' + e.message, 500);
    }
  } catch (e) {
    console.error('Unhandled API exception:', e);
    return error('服务器内部错误: ' + e.message, 500);
  }
  }
};