/**
 * Ideas Page - 创意想法
 */
class IdeasPage extends Page {
  constructor() {
    super('ideas');
    this.categories = [];
    this.currentStatus = '';
    this.currentCategory = '';
    this.allIdeas = [];
  }

  async render() {
    return `
      <div class="page-ideas">
        <div class="list-header">
          <div class="list-title">我的创意</div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-success btn-sm" id="batchGenBtn" onclick="App.pages.ideas.batchGenerate()">✨ 一键生成</button>
            <button class="btn btn-primary btn-sm" onclick="IdeasPage.showAddModal()">+ 新建</button>
          </div>
        </div>
        
        <!-- 状态筛选 -->
        <div class="filter-tabs">
          <button class="filter-tab active" data-status="" onclick="App.pages.ideas.filterByStatus('')">全部</button>
          <button class="filter-tab" data-status="pending" onclick="App.pages.ideas.filterByStatus('pending')">待生成</button>
          <button class="filter-tab" data-status="generating" onclick="App.pages.ideas.filterByStatus('generating')">生成中</button>
          <button class="filter-tab" data-status="done" onclick="App.pages.ideas.filterByStatus('done')">已完成</button>
        </div>

        <!-- 分类筛选 -->
        <div class="filter-tabs category-tabs" id="categoryTabs" style="background:#f9f9f9;border-top:1px solid #f0f0f0;">
          <button class="filter-tab active" data-category="" onclick="App.pages.ideas.filterByCategory('')">全部分类</button>
        </div>
        
        <!-- 创意列表 -->
        <div class="card-list" id="ideasList">
          <div class="page-loading"><div class="spinner"></div><span>加载中...</span></div>
        </div>
        
        <div class="empty-state" id="emptyState" style="display:none;">
          <div class="empty-icon">💡</div>
          <p>暂无创意，添加一个开始创作吧</p>
        </div>
      </div>
    `;
  }

  async mounted() {
    await this.loadCategories();
    await this.loadIdeas();
    this.bindCardClicks();
  }

  // 加载分类
  async loadCategories() {
    try {
      const cats = await api.getCategories();
      this.categories = cats.success ? cats.data : (Array.isArray(cats) ? cats : []);
      this.renderCategoryTabs();
    } catch (e) {
      console.error('加载分类失败', e);
    }
  }

  // 渲染分类标签
  renderCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    if (!container || this.categories.length === 0) return;
    container.innerHTML = `
      <button class="filter-tab ${this.currentCategory === '' ? 'active' : ''}" data-category="" onclick="App.pages.ideas.filterByCategory('')">全部分类</button>
    ` + this.categories.map(c => `
      <button class="filter-tab ${this.currentCategory == c.id ? 'active' : ''}" data-category="${c.id}" onclick="App.pages.ideas.filterByCategory(${c.id})">${c.name}</button>
    `).join('');
  }

  // 按状态筛选
  filterByStatus(status) {
    this.currentStatus = status;
    document.querySelectorAll('.filter-tabs:not(.category-tabs) .filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.filter-tab[data-status="${status}"]`)?.classList.add('active');
    this.renderIdeas();
  }

  // 按分类筛选
  filterByCategory(categoryId) {
    this.currentCategory = categoryId;
    document.querySelectorAll('#categoryTabs .filter-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`#categoryTabs .filter-tab[data-category="${categoryId}"]`)?.classList.add('active');
    this.renderIdeas();
  }

  async loadIdeas(status = '') {
    const list = document.getElementById('ideasList');
    list.innerHTML = '<div class="page-loading"><div class="spinner"></div><span>加载中...</span></div>';

    try {
      const res = await api.get('/ideas' + (status ? `?status=${status}` : ''));
      console.log('ideas res:', res);

      let ideas = [];
      if (Array.isArray(res)) {
        ideas = res;
      } else if (res && Array.isArray(res.data)) {
        ideas = res.data;
      } else if (res && res.ideas) {
        ideas = res.ideas;
      }
      console.log('ideas parsed:', ideas);
      this.allIdeas = ideas;
      this.renderIdeas();
    } catch (e) {
      console.error('加载失败:', e);
      list.innerHTML = '<div class="page-error">加载失败: ' + (e.message || '未知错误') + '</div>';
    }
  }

  // 渲染创意列表（带筛选）
  renderIdeas() {
    const list = document.getElementById('ideasList');
    let ideas = [...this.allIdeas];

    // 状态筛选
    if (this.currentStatus) {
      ideas = ideas.filter(i => i.status === this.currentStatus);
    }
    // 分类筛选
    if (this.currentCategory !== '') {
      ideas = ideas.filter(i => i.category_id == this.currentCategory);
    }

    if (ideas.length === 0) {
      list.innerHTML = '';
      document.getElementById('emptyState').style.display = 'flex';
      return;
    }
    document.getElementById('emptyState').style.display = 'none';

    const html = ideas.map((i, idx) => {
      try {
        return Components.ideaCard(i);
      } catch (err) {
        console.error('渲染第' + idx + '条失败:', err, i);
        return '<div class="page-error">渲染失败</div>';
      }
    }).join('');

    list.innerHTML = html;
    this.bindCardClicks();
  }

  // 绑定卡片点击事件
  bindCardClicks() {
    document.querySelectorAll('.card-idea').forEach(card => {
      card.onclick = () => {
        const id = parseInt(card.dataset.id);
        this.showDetail(id);
      };
    });
  }

  // 显示创意详情弹窗
  showDetail(id) {
    const idea = this.allIdeas.find(i => i.id === id);
    if (!idea) return;

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

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 90vw; max-height: 85vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 18px;">创意详情</h3>
          <button style="background: none; border: none; font-size: 24px; color: #999; cursor: pointer;" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div style="margin-bottom: 12px;">
          <span class="tag ${statusClass}">${statusText}</span>
          ${idea.category_name ? `<span style="background:#e3f2fd;color:#1976d2;padding:2px 8px;border-radius:4px;font-size:12px;margin-left:8px;">${idea.category_name}</span>` : ''}
        </div>
        <p style="font-size:15px;line-height:1.8;margin-bottom:16px;">${Components.escape(idea.content)}</p>
        ${idea.tags ? `<p style="font-size:13px;color:#666;margin-bottom:16px;">标签: ${idea.tags}</p>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${idea.article_id ? `<a href="article.html?id=${idea.article_id}" class="btn btn-primary" onclick="event.stopPropagation()">📖 查看文章</a>` : ''}
          ${idea.status !== 'done' ? `<button class="btn btn-success" onclick="App.pages.ideas.generateArticle(${idea.id}); this.closest('.modal-overlay').remove();">🤖 AI生成文章</button>` : ''}
          <button class="btn btn-danger" onclick="App.pages.ideas.deleteIdea(${idea.id}); this.closest('.modal-overlay').remove();">🗑️ 删除</button>
        </div>
        <p style="font-size:12px;color:#999;margin-top:16px;">创建时间: ${idea.created_at}</p>
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  }

  // 生成单篇文章
  async generateArticle(id) {
    Components.toast('正在生成...');
    try {
      const idea = this.allIdeas.find(i => i.id === id);
      await api.post('/ai/generate', { idea_id: id, idea_content: idea.content });
      Components.toast('文章生成成功');
      await this.loadIdeas();
    } catch (e) {
      Components.toast('生成失败: ' + (e.error || '请检查AI配置'));
    }
  }

  // 批量生成
  async batchGenerate() {
    const pending = this.allIdeas.filter(i => i.status === 'pending');
    if (pending.length === 0) {
      Components.toast('没有待生成的创意');
      return;
    }
    if (!await Components.confirm(`确定要生成全部 ${pending.length} 条待生成内容吗？\nAI会逐个生成，请耐心等待...`)) return;

    const btn = document.getElementById('batchGenBtn');
    btn.disabled = true;
    btn.textContent = '生成中...';
    Components.toast('开始批量生成，请耐心等待...');

    try {
      const res = await api.post('/ai/batch-generate', {});
      Components.toast(res.message || '批量生成完成');
      await this.loadIdeas();
    } catch (e) {
      Components.toast('批量生成失败: ' + (e.error || '请检查AI配置'));
    } finally {
      btn.disabled = false;
      btn.textContent = '✨ 一键生成';
    }
  }

  // 删除创意
  async deleteIdea(id) {
    if (!await Components.confirm('确定删除此创意?')) return;
    try {
      await api.delete(`/idea/${id}`);
      Components.toast('已删除');
      await this.loadIdeas();
    } catch (e) {
      Components.toast('删除失败');
    }
  }

  static async showAddModal() {
    // 加载分类
    let categoryOptions = '<option value="">请选择</option>';
    try {
      const cats = await api.getCategories();
      const list = cats.success ? cats.data : (Array.isArray(cats) ? cats : []);
      categoryOptions += list.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (e) {}

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 90vw; max-height: 85vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 18px;">新建创意</h3>
          <button style="background: none; border: none; font-size: 24px; color: #999; cursor: pointer;" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="form-group">
          <label class="form-label">创意内容</label>
          <textarea class="form-input" id="ideaContent" rows="4" placeholder="描述你的创意..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">分类</label>
          <select class="form-input" id="ideaCategory">
            ${categoryOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">标签（多个用逗号分隔）</label>
          <input type="text" class="form-input" id="ideaTags" placeholder="例如：科技,生活">
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="btn btn-primary" id="saveIdeaBtn" style="flex: 1;">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // 保存按钮事件
    modal.querySelector('#saveIdeaBtn').onclick = async () => {
      const content = document.getElementById('ideaContent').value.trim();
      if (!content) {
        Components.toast('请输入创意内容');
        return;
      }
      const btn = document.getElementById('saveIdeaBtn');
      btn.disabled = true;
      btn.textContent = '保存中...';
      
      try {
        const tags = document.getElementById('ideaTags').value.trim();
        await api.post('/ideas', { 
          content, 
          category_id: document.getElementById('ideaCategory').value,
          tags 
        });
        Components.toast('创建成功');
        modal.remove();
        App.loadPage('ideas');
      } catch (e) {
        Components.toast('创建失败');
        btn.disabled = false;
        btn.textContent = '保存';
      }
    };
  }
}

App.register('ideas', new IdeasPage());
