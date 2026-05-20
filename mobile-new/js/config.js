/**
 * 配置文件
 */

const Config = {
    // API 基础地址
    API_BASE: '',

    // 默认每页数量
    PAGE_SIZE: 10,

    // 本地存储键名
    STORAGE_KEYS: {
        TOKEN: 'wenzhang_token',
        USER: 'wenzhang_user',
        SEARCH_HISTORY: 'search_history',
        THEME: 'wenzhang_theme'
    },

    // 分类列表
    CATEGORIES: [
        { id: 'all', name: '全部', icon: '📚' },
        { id: 'tech', name: '技术', icon: '💻' },
        { id: 'life', name: '生活', icon: '🌿' },
        { id: 'ideas', name: '创意', icon: '💡' },
        { id: 'notes', name: '笔记', icon: '📝' }
    ],

    // 分页加载状态
    loading: false,
    page: 1,
    hasMore: true,

    // 重置分页状态
    resetPagination() {
        this.loading = false;
        this.page = 1;
        this.hasMore = true;
    }
};
