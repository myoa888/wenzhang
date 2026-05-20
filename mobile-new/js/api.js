/**
 * API 请求模块 - 手机端新版
 */

class Api {
  static getToken() {
    return localStorage.getItem('token') || '';
  }

  static getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  static async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : CONFIG.API_BASE + url;
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || '请求失败');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // 认证
  static async login(username, password) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  static async register(username, password, email) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email })
    });
  }

  static logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  }

  static getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  static isLoggedIn() {
    return !!this.getToken();
  }

  // 文章
  static async getArticles(params = {}) {
    const query = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || CONFIG.PAGE_SIZE,
      ...params
    }).toString();
    return this.request(`/articles?${query}`);
  }

  static async getArticle(id) {
    return this.request(`/article/${id}`);
  }

  static async createArticle(data) {
    return this.request('/article', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async updateArticle(id, data) {
    return this.request(`/article/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async deleteArticle(id) {
    return this.request(`/article/${id}`, {
      method: 'DELETE'
    });
  }

  // 我的文章
  static async getMyArticles(params = {}) {
    const query = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || CONFIG.PAGE_SIZE,
      ...params
    }).toString();
    return this.request(`/my/articles?${query}`);
  }

  // 分类
  static async getCategories() {
    return this.request('/categories');
  }

  static async createCategory(name) {
    return this.request('/category', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  static async deleteCategory(id) {
    return this.request(`/category/${id}`, {
      method: 'DELETE'
    });
  }

  // 标签
  static async getTags() {
    return this.request('/tags');
  }

  // 搜索
  static async search(keyword) {
    return this.request(`/search?keyword=${encodeURIComponent(keyword)}`);
  }

  // 统计数据
  static async getStats() {
    return this.request('/stats');
  }

  // 上传图片
  static async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = this.getToken();
    const response = await fetch(CONFIG.API_BASE + '/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    return response.json();
  }
}

// Toast 提示
function showToast(message, duration = 2000) {
  // 移除已有的 toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 9999;
    font-size: 14px;
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), duration);
}

// 加载状态
function showLoading(container) {
  const loader = document.createElement('div');
  loader.className = 'loading';
  loader.innerHTML = '<div class="spinner"></div><span>加载中...</span>';
  container.innerHTML = '';
  container.appendChild(loader);
}

function hideLoading() {
  const loader = document.querySelector('.loading');
  if (loader) loader.remove();
}

// 格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

// 格式化阅读时间
function formatReadTime(content) {
  const words = content ? content.replace(/[#*`\[\]]/g, '').length : 0;
  const minutes = Math.ceil(words / 500);
  return minutes < 1 ? '< 1' : minutes;
}
