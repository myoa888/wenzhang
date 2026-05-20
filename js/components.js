/**
 * Components - 公共组件库
 */

const Components = {
  // 默认头像 SVG
  defaultAvatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='8' r='4' fill='%23999'/%3E%3Cpath d='M4 20c0-4 4-6 8-6s8 2 8 6' fill='none' stroke='%23999' stroke-width='2'/%3E%3C/svg%3E",

  // Toast 提示
  toast(msg, duration = 2000) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  },

  // 确认对话框
  confirm(msg) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-box">
          <p class="modal-text">${msg}</p>
          <div class="modal-btns">
            <button class="btn btn-outline" id="cancelBtn">取消</button>
            <button class="btn btn-primary" id="confirmBtn">确定</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#cancelBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
      modal.querySelector('#confirmBtn').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
    });
  },

  // 底部弹窗
  bottomSheet(options) {
    const { title = '', content = '', actions = [] } = options;
    const sheet = document.createElement('div');
    sheet.className = 'bottom-sheet';
    sheet.innerHTML = `
      ${title ? `<div class="sheet-header"><h3>${title}</h3><button class="sheet-close">&times;</button></div>` : ''}
      <div class="sheet-content">${content}</div>
      ${actions.length ? `<div class="sheet-actions">${actions.map(a => `<button class="btn ${a.class || ''}">${a.text}</button>`).join('')}</div>` : ''}
    `;
    document.body.appendChild(sheet);

    // 点击关闭
    sheet.querySelector('.sheet-close')?.addEventListener('click', () => this.closeBottomSheet(sheet));
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) this.closeBottomSheet(sheet);
    });

    return sheet;
  },

  closeBottomSheet(sheet) {
    sheet.classList.remove('show');
    setTimeout(() => sheet.remove(), 300);
  },

  // 文章卡片
  articleCard(article) {
    return `
      <a href="article.html?id=${article.id}" class="card card-article">
        ${article.cover_image ? `<div class="card-cover" style="background-image: url(${article.cover_image})"></div>` : ''}
        <div class="card-body">
          <h3 class="card-title">${this.escape(article.title)}</h3>
          ${article.summary ? `<p class="card-summary">${this.escape(article.summary.substring(0, 60))}...</p>` : ''}
          <div class="card-meta">
            ${article.category_name ? `<span class="tag tag-blue">${article.category_name}</span>` : ''}
            <span class="card-date">${this.formatDate(article.published_at || article.created_at)}</span>
          </div>
        </div>
      </a>
    `;
  },

  // 创意卡片
  ideaCard(idea) {
    const statusClass = {
      pending: 'tag-orange',
      generating: 'tag-blue',
      done: 'tag-green',
      error: 'tag-red'
    }[idea.status] || 'tag-gray';

    const statusText = {
      pending: '待生成',
      generating: '生成中',
      done: '已完成',
      error: '失败'
    }[idea.status] || idea.status;

    return `
      <div class="card card-idea" data-id="${idea.id}">
        <div class="card-header">
          <div>
            <span class="tag ${statusClass}">${statusText}</span>
            ${idea.category_name ? `<span style="background:#e3f2fd;color:#1976d2;padding:2px 8px;border-radius:4px;font-size:11px;margin-left:4px;">${idea.category_name}</span>` : ''}
          </div>
          <span class="card-date">${this.formatDate(idea.created_at)}</span>
        </div>
        <p class="card-content">${this.escape(idea.content)}</p>
        ${idea.article_id ? `<a href="article.html?id=${idea.article_id}" class="card-link" onclick="event.stopPropagation()">查看文章 →</a>` : ''}
      </div>
    `;
  },

  // 工具方法
  escape(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    return `${date.getMonth() + 1}/${date.getDate()}`;
  },

  debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
};

// 导出
window.Components = Components;
