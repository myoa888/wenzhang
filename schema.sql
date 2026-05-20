-- ================================================
-- 文章管理系统数据库初始化脚本
-- 使用 Cloudflare D1
-- ================================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    cover_image TEXT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    status TEXT DEFAULT 'draft',  -- draft:草稿, pending_review:待审核, need_fix:需修改, published:已发布
    view_count INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    allow_comment INTEGER DEFAULT 1,
    need_regenerate INTEGER DEFAULT 0,  -- 0:无需重写, 1:需要AI重写
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#666666'
);

-- 文章标签关联表
CREATE TABLE IF NOT EXISTS article_tags (
    article_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    issue_type TEXT,  -- text_error:文字问题, image_error:图片问题, logic_error:逻辑问题, style_error:风格问题, other:其他
    fixed INTEGER DEFAULT 0,  -- 0:未修复, 1:已修复
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id)
);

-- 会话表（用于token管理）
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 全文索引（可选，用于搜索优化）
-- D1 支持 FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title, content, summary,
    content='articles',
    content_rowid='id'
);

-- 触发器保持 FTS 同步
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
    INSERT INTO articles_fts(rowid, title, content, summary) VALUES (new.id, new.title, new.content, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
    INSERT INTO articles_fts(articles_fts, rowid, title, content, summary) VALUES('delete', old.id, old.title, old.content, old.summary);
END;

CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
    INSERT INTO articles_fts(articles_fts, rowid, title, content, summary) VALUES('delete', old.id, old.title, old.content, old.summary);
    INSERT INTO articles_fts(rowid, title, content, summary) VALUES (new.id, new.title, new.content, new.summary);
END;

-- ================================================
-- 创意想法表
-- ================================================
CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'manual',  -- manual:手动, voice:语音, import:导入
    status TEXT DEFAULT 'pending',  -- pending:待生成, generating:生成中, done:已完成
    article_id INTEGER,
    priority INTEGER DEFAULT 0,  -- 优先级 0-9
    tags TEXT,  -- 逗号分隔标签
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
);

-- ================================================
-- 待办任务表
-- ================================================
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    assignee TEXT DEFAULT 'user',  -- user:用户任务, ai:AI任务
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL,  -- generate_article:生成文章, fix_article:修复文章, review:审核, other:其他
    related_article_id INTEGER,
    related_idea_id INTEGER,
    priority INTEGER DEFAULT 5,  -- 1-9, 越高越优先
    status TEXT DEFAULT 'pending',  -- pending:待处理, in_progress:进行中, completed:已完成, cancelled:已取消
    due_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (related_article_id) REFERENCES articles(id) ON DELETE SET NULL,
    FOREIGN KEY (related_idea_id) REFERENCES ideas(id) ON DELETE SET NULL
);

-- ================================================
-- 附件表（存储上传的文件）
-- ================================================
CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    idea_id INTEGER,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,  -- R2/本地存储路径
    url TEXT NOT NULL,  -- 访问URL
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ================================================
-- AI生成记录表
-- ================================================
CREATE TABLE IF NOT EXISTS ai_generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id INTEGER,
    article_id INTEGER,
    user_id INTEGER NOT NULL,
    prompt TEXT NOT NULL,  -- 输入提示词
    model TEXT NOT NULL,  -- 使用的模型
    result TEXT,  -- AI返回结果(JSON格式)
    status TEXT DEFAULT 'pending',  -- pending:等待中, generating:生成中, success:成功, failed:失败
    error_message TEXT,
    tokens_used INTEGER,  -- 消耗token数
    cost DECIMAL(10,4),  -- 费用
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE SET NULL,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ================================================
-- 文章审核历史表
-- ================================================
CREATE TABLE IF NOT EXISTS article_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    revision_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    cover_image TEXT,
    comment TEXT,  -- 修改说明
    created_by INTEGER NOT NULL,  -- user或ai
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ================================================
-- 初始数据
-- ================================================

-- 默认分类
INSERT INTO categories (name, slug, description, sort_order) VALUES
('技术', 'tech', '技术文章、编程、软件开发', 1),
('生活', 'life', '生活随笔、日常记录', 2),
('笔记', 'notes', '学习笔记、知识整理', 3),
('其他', 'other', '其他类型文章', 99);

-- 添加AI用户(系统用户)
INSERT OR IGNORE INTO users (id, username, password_hash, email, avatar) 
VALUES (1, 'ai_assistant', 'ai_no_password', 'ai@system.local', '/assets/ai-avatar.png');
