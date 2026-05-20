/**
 * API 请求封装
 */

const api = {
  // 获取token
  getToken() {
    return localStorage.getItem('token');
  },

  // 通用请求方法
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await res.json();

      // 未登录统一处理
      if (!data.success && (data.error === '需要登录' || data.error?.includes('登录') || res.status === 401)) {
        localStorage.removeItem('token');
        // 保存当前页面路径，登录后跳转回来
        sessionStorage.setItem('redirect_after_login', window.location.href);
        window.location.href = 'login.html';
        return;
      }

      if (!data.success) {
        throw data;
      }

      return data;
    } catch (e) {
      console.error('API请求失败:', e);
      throw e;
    }
  },

  // GET请求
  async get(endpoint) {
    return this.request(endpoint);
  },

  // POST请求
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // PUT请求
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // DELETE请求
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  },

  // ========== 认证相关 ==========

  // 注册
  async register(username, password, email = '') {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email })
    });
  },

  // 登录
  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  // 登出
  async logout(token) {
    return this.request('/auth/logout', {
      method: 'POST'
    });
  },

  // 获取当前用户
  async getUser() {
    return this.request('/user');
  },

  // ========== 文章相关 ==========

  // 获取文章列表（公开）
  async getArticles(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/articles${query ? '?' + query : ''}`);
  },

  // 获取单篇文章
  async getArticle(slug) {
    return this.request(`/article/${slug}`);
  },

  // 搜索文章
  async search(keyword) {
    return this.request(`/search?keyword=${encodeURIComponent(keyword)}`);
  },

  // 获取我的文章
  async getMyArticles(token, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/my/articles${query ? '?' + query : ''}`);
  },

  // 创建文章
  async createArticle(data) {
    return this.request('/articles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 更新文章
  async updateArticle(id, data, token) {
    return this.request(`/article/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除文章
  async deleteArticle(id, token) {
    return this.request(`/article/${id}`, {
      method: 'DELETE'
    });
  },

  // ========== 分类相关 ==========

  // 获取分类列表
  async getCategories() {
    return this.request('/categories');
  },

  // 创建分类
  async createCategory(data, token) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 更新分类
  async updateCategory(id, data, token) {
    return this.request(`/category/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除分类
  async deleteCategory(id, token) {
    return this.request(`/category/${id}`, {
      method: 'DELETE'
    });
  },

  // ========== 标签相关 ==========

  // 获取标签列表
  async getTags() {
    return this.request('/tags');
  },

  // ========== 统计相关 ==========

  // 获取统计数据
  async getStats() {
    return this.request('/stats');
  },

  // ========== 评论相关 ==========

  // 获取文章评论列表
  async getComments(articleId, all = false) {
    return this.request(`/comments/${articleId}${all ? '?all=true' : ''}`);
  },

  // 发表评论（支持问题标记）
  async createComment(data) {
    return this.request('/comments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 删除评论
  async deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, {
      method: 'DELETE'
    });
  },

  // ========== 创意想法相关 ==========

  // 获取创意列表
  async getIdeas(status) {
    return this.request(`/ideas${status ? '?status=' + status : ''}`);
  },

  // 创建创意
  async createIdea(data) {
    return this.request('/ideas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 更新创意
  async updateIdea(id, data) {
    return this.request(`/idea/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除创意
  async deleteIdea(id) {
    return this.request(`/idea/${id}`, {
      method: 'DELETE'
    });
  },

  // ========== 待办任务相关 ==========

  // 获取待办列表
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks${query ? '?' + query : ''}`);
  },

  // 创建待办
  async createTask(data) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 更新待办
  async updateTask(id, data) {
    return this.request(`/task/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除待办
  async deleteTask(id) {
    return this.request(`/task/${id}`, {
      method: 'DELETE'
    });
  },

  // ========== AI相关 ==========

  // AI生成文章
  async generateArticle(data) {
    return this.request('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // AI生成图片
  async generateImage(data) {
    return this.request('/ai/image', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // AI修复文章
  async fixArticle(data) {
    return this.request('/ai/fix', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // ========== 审核相关 ==========

  // 获取待审核文章
  async getPendingReview() {
    return this.request('/pending-review');
  },

  // 审核文章
  async reviewArticle(articleId, action) {
    return this.request('/article/review', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId, action })
    });
  },

  // ========== 附件相关 ==========

  // 获取附件列表
  async getAttachments() {
    return this.request('/attachments');
  },

  // 上传文件
  async uploadFile(file, onProgress) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return res.json();
  },

  // ========== 导出相关 ==========

  // 一键导出数据
  async exportData() {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/export`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.blob();
  }
};
