/**
 * API 请求封装
 */

const API = {
    /**
     * 发送请求
     */
    async request(url, options = {}) {
        const token = localStorage.getItem(Config.STORAGE_KEYS.TOKEN);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    /**
     * 获取文章列表
     */
    async getArticles(params = {}) {
        const query = new URLSearchParams({
            page: params.page || 1,
            limit: params.limit || Config.PAGE_SIZE,
            category: params.category || 'all',
            keyword: params.keyword || ''
        });
        
        return this.request(`${Config.API_BASE}/api/articles?${query}`);
    },

    /**
     * 获取文章详情
     */
    async getArticle(id) {
        return this.request(`${Config.API_BASE}/api/articles/${id}`);
    },

    /**
     * 获取分类列表
     */
    async getCategories() {
        return this.request(`${Config.API_BASE}/api/categories`);
    },

    /**
     * 搜索文章
     */
    async search(keyword) {
        return this.request(`${Config.API_BASE}/api/articles/search?keyword=${encodeURIComponent(keyword)}`);
    },

    /**
     * 登录
     */
    async login(username, password) {
        return this.request(`${Config.API_BASE}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },

    /**
     * 注册
     */
    async register(username, email, password) {
        return this.request(`${Config.API_BASE}/api/auth/register`, {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    },

    /**
     * 获取用户信息
     */
    async getUserInfo() {
        return this.request(`${Config.API_BASE}/api/user/info`);
    },

    /**
     * 创建文章
     */
    async createArticle(data) {
        return this.request(`${Config.API_BASE}/api/articles`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * 更新文章
     */
    async updateArticle(id, data) {
        return this.request(`${Config.API_BASE}/api/articles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    /**
     * 删除文章
     */
    async deleteArticle(id) {
        return this.request(`${Config.API_BASE}/api/articles/${id}`, {
            method: 'DELETE'
        });
    },

    /**
     * 获取统计数据
     */
    async getStats() {
        return this.request(`${Config.API_BASE}/api/stats`);
    },

    /**
     * 获取 AI 配置
     */
    async getAIConfig() {
        return this.request(`${Config.API_BASE}/api/ai/config`);
    },

    /**
     * 保存 AI 配置
     */
    async saveAIConfig(config) {
        return this.request(`${Config.API_BASE}/api/ai/config`, {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }
};
