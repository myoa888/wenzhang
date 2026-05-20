/**
 * My Page - 我的
 */
class MyPage extends Page {
  constructor() {
    super('my');
  }

  async render() {
    const user = this.getUser();
    
    if (!user) {
      return `
        <div class="page-my page-my-guest">
          <div class="guest-bg"></div>
          <div class="guest-content">
            <div class="guest-avatar">👤</div>
            <p class="guest-tip">登录后查看更多信息</p>
            <a href="login.html" class="btn btn-primary">立即登录</a>
          </div>
        </div>
      `;
    }

    return `
      <div class="page-my">
        <!-- 用户卡片 -->
        <div class="user-card">
          <div class="user-card-bg"></div>
          <div class="user-card-content">
            <img src="${user.avatar || Components.defaultAvatar}" class="user-avatar" alt="头像">
            <div class="user-info">
              <div class="user-name">${Components.escape(user.username)}</div>
              <div class="user-email">${Components.escape(user.email || '')}</div>
            </div>
          </div>
        </div>
        
        <!-- 数据统计 -->
        <div class="stats-row" id="statsRow">
          <div class="stat-item">
            <div class="stat-value" id="articleCount">-</div>
            <div class="stat-label">文章</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="ideaCount">-</div>
            <div class="stat-label">创意</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="taskCount">-</div>
            <div class="stat-label">待办</div>
          </div>
        </div>
        
        <!-- 功能菜单 -->
        <div class="menu-section">
          <div class="menu-item" onclick="App.navigate('my-articles')">
            <div class="menu-icon menu-icon-blue">📄</div>
            <span class="menu-text">我的文章</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" onclick="App.navigate('ideas')">
            <div class="menu-icon menu-icon-purple">💡</div>
            <span class="menu-text">我的创意</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" onclick="App.navigate('tasks')">
            <div class="menu-icon menu-icon-orange">✅</div>
            <span class="menu-text">待办任务</span>
            <span class="menu-badge" id="pendingBadge" style="display:none;">0</span>
            <span class="menu-arrow">›</span>
          </div>
        </div>
        
        <div class="menu-section">
          <a href="ai-config.html" class="menu-item">
            <div class="menu-icon menu-icon-teal">🤖</div>
            <span class="menu-text">AI 配置</span>
            <span class="menu-arrow">›</span>
          </a>
          <a href="stats.html" class="menu-item">
            <div class="menu-icon menu-icon-green">📊</div>
            <span class="menu-text">数据统计</span>
            <span class="menu-arrow">›</span>
          </a>
          <a href="categories.html" class="menu-item">
            <div class="menu-icon menu-icon-gray">📂</div>
            <span class="menu-text">分类管理</span>
            <span class="menu-arrow">›</span>
          </a>
        </div>
        
        <div class="menu-section">
          <a href="manage.html" class="menu-item">
            <div class="menu-icon menu-icon-gray">⚙️</div>
            <span class="menu-text">管理后台</span>
            <span class="menu-arrow">›</span>
          </a>
          <a href="editor.html" class="menu-item">
            <div class="menu-icon menu-icon-blue">✏️</div>
            <span class="menu-text">写文章</span>
            <span class="menu-arrow">›</span>
          </a>
        </div>
        
        <button class="logout-btn" onclick="MyPage.logout()">退出登录</button>
      </div>
    `;
  }

  mounted() {
    if (this.getUser()) {
      this.loadStats();
      this.loadPendingCount();
    }
  }

  getUser() {
    const token = api.getToken();
    if (!token) return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  async loadStats() {
    try {
      const res = await api.get('/stats');
      if (res && res.articles) {
        document.getElementById('articleCount').textContent = res.articles?.published || 0;
        document.getElementById('ideaCount').textContent = res.ideas?.total || 0;
        document.getElementById('taskCount').textContent = res.tasks?.pending || 0;
      }
    } catch (e) {}
  }

  async loadPendingCount() {
    try {
      const res = await api.get('/tasks?status=pending');
      const pendingTasks = res?.data || res || [];
      const count = pendingTasks.length || 0;
      const badge = document.getElementById('pendingBadge');
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'block';
      }
    } catch (e) {}
  }

  static async logout() {
    if (!await Components.confirm('确定要退出登录吗？')) return;
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    Components.toast('已退出');
    App.loadPage('my');
  }
}

App.register('my', new MyPage());
