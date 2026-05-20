/**
 * Ideas Page - 创意想法
 */
class IdeasPage extends Page {
  constructor() {
    super('ideas');
  }

  async render() {
    return `
      <div class="page-ideas">
        <div class="list-header">
          <div class="list-title">我的创意</div>
          <button class="btn btn-primary btn-sm" onclick="IdeasPage.showAddModal()">+ 新建</button>
        </div>
        
        <!-- 状态筛选 -->
        <div class="filter-tabs">
          <button class="filter-tab active" data-status="">全部</button>
          <button class="filter-tab" data-status="pending">待生成</button>
          <button class="filter-tab" data-status="done">已完成</button>
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

  mounted() {
    this.initFilters();
    this.loadIdeas();
  }

  initFilters() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.loadIdeas(tab.dataset.status);
      });
    });
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
    } catch (e) {
      console.error('加载失败:', e);
      list.innerHTML = '<div class="page-error">加载失败: ' + (e.message || '未知错误') + '</div>';
    }
  }

  static async showAddModal() {
    const sheet = Components.bottomSheet({
      title: '新建创意',
      content: `
        <div class="form-group">
          <textarea class="form-input" id="ideaContent" rows="4" placeholder="描述你的创意..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">分类</label>
          <select class="form-input" id="ideaCategory">
            <option value="">请选择</option>
          </select>
        </div>
      `,
      actions: [
        { text: '取消', class: 'btn-outline', handler: () => Components.closeBottomSheet(sheet) },
        { text: '保存', class: 'btn-primary', handler: async () => {
          const content = document.getElementById('ideaContent').value.trim();
          if (!content) {
            Components.toast('请输入创意内容');
            return;
          }
          try {
            await api.post('/ideas', { content, category_id: document.getElementById('ideaCategory').value });
            Components.toast('创建成功');
            Components.closeBottomSheet(sheet);
            App.loadPage('ideas');
          } catch (e) {
            Components.toast('创建失败');
          }
        }}
      ]
    });
    sheet.classList.add('show');
  }
}

App.register('ideas', new IdeasPage());
