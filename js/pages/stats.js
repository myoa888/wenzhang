/**
 * Stats Page - 统计
 */
class StatsPage extends Page {
  constructor() {
    super('stats');
  }

  async render() {
    return `
      <div class="page-stats">
        <div class="stats-header">
          <h1>📊 内容创作统计</h1>
          <p>记录你的每一次创作</p>
        </div>
        
        <div id="stats-content">
          <div class="loading">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>
        </div>
      </div>
    `;
  }

  mounted() {
    this.loadStats();
  }

  async loadStats() {
    try {
      const res = await api.get('/stats');
      this.renderStats(res);
    } catch (e) {
      document.getElementById('stats-content').innerHTML = `
        <div class="error-state">
          <p>加载失败，请稍后重试</p>
          <button class="btn btn-primary" onclick="StatsPage.reload()">重新加载</button>
        </div>
      `;
    }
  }

  renderStats(data) {
    const { articles, views, ai, ideas, categories, tags, errors } = data;
    
    // 计算用户创建 vs AI 生成的比例
    const userCreated = articles?.user_created || 0;
    const aiGenerated = ai?.success || 0;
    const total = userCreated + aiGenerated;
    const userPercent = total > 0 ? Math.round((userCreated / total) * 100) : 50;
    const aiPercent = total > 0 ? 100 - userPercent : 50;

    document.getElementById('stats-content').innerHTML = `
      <div class="stats-section">
        <div class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="#409eff" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          文章统计
        </div>
        <div class="stats-grid">
          <div class="stats-card user-card">
            <div class="label">已发布</div>
            <div class="value">${articles?.published || 0}</div>
            <div class="desc">篇</div>
          </div>
          <div class="stats-card ai-card">
            <div class="label">待审核</div>
            <div class="value">${articles?.pending_review || 0}</div>
            <div class="desc">篇</div>
          </div>
          <div class="stats-card">
            <div class="label">草稿</div>
            <div class="value">${articles?.draft || 0}</div>
            <div class="desc">篇</div>
          </div>
          <div class="stats-card">
            <div class="label">总浏览</div>
            <div class="value">${this.formatNumber(views)}</div>
            <div class="desc">次</div>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="#67c23a" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
          AI 工作量
        </div>
        <div class="stats-grid">
          <div class="stats-card ai-card">
            <div class="label">AI 生成成功</div>
            <div class="value">${ai?.success || 0}</div>
            <div class="desc">篇</div>
          </div>
          <div class="stats-card">
            <div class="label">AI 生成失败</div>
            <div class="value">${ai?.failed || 0}</div>
            <div class="desc">次</div>
          </div>
        </div>
      </div>

      ${errors && errors.length > 0 ? `
      <div class="error-list">
        <div class="error-list-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h4>AI 生成失败记录</h4>
          <span class="count">${errors.length} 条</span>
        </div>
        ${errors.map(err => `
        <div class="error-item">
          <div class="prompt">${this.escapeHtml(err.idea_content || err.prompt || '未知内容')}</div>
          <div class="message">${this.escapeHtml(err.error_message || '未知错误')}</div>
          <div class="time">${this.formatDate(err.created_at)}</div>
        </div>
        `).join('')}
      </div>
      ` : `
      <div class="error-list">
        <div class="error-list-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
          <h4>AI 生成记录</h4>
        </div>
        <div class="no-error">✅ 暂无失败记录，AI 生成一切顺利！</div>
      </div>
      `}

      <div class="comparison-card">
        <div class="comparison-header">
          <h3>🤝 用户 vs AI 创作对比</h3>
          <p>谁写的更多？</p>
        </div>
        
        <div class="pie-chart" style="--user-percent: ${userPercent}%">
          <div class="pie-center">
            <div class="num">${total}</div>
            <div class="label">总文章</div>
          </div>
        </div>
        
        <div class="legend">
          <div class="legend-item">
            <span class="legend-dot user"></span>
            <span>用户创作 ${userCreated} 篇 (${userPercent}%)</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot ai"></span>
            <span>AI 生成 ${aiGenerated} 篇 (${aiPercent}%)</span>
          </div>
        </div>
      </div>

      <div class="progress-section">
        <div class="section-title" style="margin-bottom: 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#e6a23c" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          创意转化进度
        </div>
        
        <div class="progress-item">
          <div class="progress-header">
            <span class="progress-label">创意 → 文章</span>
            <span class="progress-value">${ideas?.done || 0} / ${ideas?.total || 0}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill green" style="width: ${ideas?.total > 0 ? ((ideas?.done || 0) / ideas?.total * 100) : 0}%"></div>
          </div>
        </div>
        
        <div class="progress-item">
          <div class="progress-header">
            <span class="progress-label">待生成创意</span>
            <span class="progress-value">${ideas?.pending || 0} 条</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill orange" style="width: ${ideas?.total > 0 ? ((ideas?.pending || 0) / ideas?.total * 100) : 0}%"></div>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="#909399" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          内容资产
        </div>
        <div class="stats-grid">
          <div class="stats-card">
            <div class="label">分类</div>
            <div class="value">${categories || 0}</div>
            <div class="desc">个</div>
          </div>
          <div class="stats-card">
            <div class="label">标签</div>
            <div class="value">${tags || 0}</div>
            <div class="desc">个</div>
          </div>
        </div>
      </div>

      <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        数据更新时间: ${new Date().toLocaleString('zh-CN')}
      </div>
    `;
  }

  formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num || 0;
  }
  
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
  }
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static reload() {
    App.loadPage('stats');
  }
}

App.register('stats', new StatsPage());
