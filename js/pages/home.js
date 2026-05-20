/**
 * Home Page - 首页
 */
class HomePage extends Page {
  constructor() {
    super('home');
    this.currentTab = 'all';
    this.page = 1;
    this.loading = false;
  }

  async render() {
    return `
      <div class="page-home">
        <!-- 刷新提示 -->
        <div class="pull-tip" id="pullTip"><span>下拉刷新</span></div>
        
        <!-- 文章列表 -->
        <div class="article-list" id="articleList">
          <div class="page-loading"><div class="spinner"></div><span>加载中...</span></div>
        </div>
        
        <!-- 空状态 -->
        <div class="empty-state" id="emptyState" style="display:none;">
          <div class="empty-icon">📭</div>
          <p>暂无文章</p>
        </div>
      </div>
    `;
  }

  mounted() {
    this.initPullRefresh();
    this.initScrollLoad();
    this.loadArticles(true);
  }

  initPullRefresh() {
    let startY = 0;
    document.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    });
    document.addEventListener('touchend', (e) => {
      const endY = e.changedTouches[0].clientY;
      if (startY < 50 && endY - startY > 100) {
        document.getElementById('pullTip').classList.add('show');
        setTimeout(() => {
          this.loadArticles(true);
          document.getElementById('pullTip').classList.remove('show');
        }, 500);
      }
    });
  }

  initScrollLoad() {
    window.addEventListener('scroll', Components.debounce(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        this.loadArticles();
      }
    }, 200));
  }

  async loadArticles(refresh = false) {
    if (this.loading) return;
    if (refresh) this.page = 1;
    this.loading = true;

    const list = document.getElementById('articleList');
    const emptyState = document.getElementById('emptyState');
    if (refresh) {
      list.innerHTML = '<div class="page-loading"><div class="spinner"></div><span>加载中...</span></div>';
    }

    try {
      const res = await api.get(`/articles?limit=20&page=${this.page}`);
      console.log('articles res:', res);

      let articles = [];
      if (Array.isArray(res)) articles = res;
      else if (res && Array.isArray(res.articles)) articles = res.articles;
      else if (res && Array.isArray(res.data)) articles = res.data;

      if (articles.length === 0 && this.page === 1) {
        list.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        this.loading = false;
        return;
      }
      if (emptyState) emptyState.style.display = 'none';

      const html = articles.map(a => Components.articleCard(a)).join('');
      
      if (refresh || this.page === 1) {
        list.innerHTML = html;
      } else {
        list.innerHTML += html;
      }

      this.page++;
      this.loading = false;
    } catch (e) {
      console.error('加载失败:', e);
      list.innerHTML = '<div class="page-error">加载失败: ' + (e.message || '') + '</div>';
      this.loading = false;
    }
  }
}

// 注册页面
App.register('home', new HomePage());
