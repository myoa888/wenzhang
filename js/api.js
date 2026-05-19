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

      return await res.json();
    } catch (e) {
      console.error('API请求失败:', e);
      throw e;
    }
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
  }
};
