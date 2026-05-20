/**
 * App - SPA 路由与页面管理
 */

const App = {
  currentPage: 'home',
  $container: null,
  $tabbar: null,
  pages: {},

  // 初始化
  init() {
    this.$container = document.getElementById('page-container');
    this.$tabbar = document.getElementById('tabbar');
    this.bindEvents();
    this.handleRoute();
  },

  // 绑定事件
  bindEvents() {
    // Tabbar 点击
    this.$tabbar.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        const page = tab.dataset.tab;
        this.navigate(page);
      }
    });

    // 浏览器前进后退
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });
  },

  // 路由处理
  handleRoute() {
    const hash = location.hash.slice(1) || 'home';
    this.loadPage(hash);
  },

  // 导航到指定页面
  navigate(page, replace = false) {
    if (replace) {
      history.replaceState(null, '', `#${page}`);
    } else {
      history.pushState(null, '', `#${page}`);
    }
    this.loadPage(page);
  },

  // 加载页面
  async loadPage(page) {
    // 更新 Tabbar 状态
    this.updateTabbar(page);

    // 显示加载状态
    this.showLoading();

    try {
      const pageModule = this.pages[page];
      if (pageModule && pageModule.render) {
        const html = await pageModule.render();
        this.$container.innerHTML = html;
        if (pageModule.mounted) {
          pageModule.mounted();
        }
      } else {
        this.$container.innerHTML = '<div class="page-error">页面不存在</div>';
      }
    } catch (e) {
      console.error('页面加载失败:', e);
      this.$container.innerHTML = '<div class="page-error">加载失败，请重试</div>';
    }
  },

  // 更新 Tabbar 高亮
  updateTabbar(page) {
    this.$tabbar.querySelectorAll('[data-tab]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === page);
    });
  },

  // 显示加载
  showLoading() {
    this.$container.innerHTML = `
      <div class="page-loading">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>
    `;
  },

  // 注册页面模块
  register(pageName, module) {
    this.pages[pageName] = module;
  }
};

// 页面模块基类
class Page {
  constructor(name) {
    this.name = name;
  }

  async render() {
    return '<div>页面加载中...</div>';
  }

  mounted() {}
}

// 导出
window.App = App;
window.Page = Page;
