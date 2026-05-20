/**
 * Tasks Page - 待办任务
 */
class TasksPage extends Page {
  constructor() {
    super('tasks');
  }

  async render() {
    return `
      <div class="page-tasks">
        <div class="list-header">
          <div class="list-title">待办事项</div>
          <button class="btn btn-primary btn-sm" onclick="TasksPage.showAddModal()">+ 添加</button>
        </div>
        
        <!-- 待办列表 -->
        <div class="task-list" id="taskList">
          <div class="page-loading"><div class="spinner"></div><span>加载中...</span></div>
        </div>
        
        <div class="empty-state" id="emptyState" style="display:none;">
          <div class="empty-icon">✅</div>
          <p>没有待办事项</p>
        </div>
      </div>
    `;
  }

  mounted() {
    this.loadTasks();
  }

  async loadTasks() {
    const list = document.getElementById('taskList');
    list.innerHTML = '<div class="page-loading"><div class="spinner"></div><span>加载中...</span></div>';

    try {
      const res = await api.get('/tasks');
      console.log('tasks res:', res);

      let tasks = [];
      if (Array.isArray(res)) tasks = res;
      else if (res && Array.isArray(res.data)) tasks = res.data;
      else if (res && res.tasks) tasks = res.tasks;

      if (tasks.length === 0) {
        list.innerHTML = '';
        document.getElementById('emptyState').style.display = 'flex';
        return;
      }
      document.getElementById('emptyState').style.display = 'none';

      // 分组
      const pending = tasks.filter(t => t.status !== 'completed');
      const completed = tasks.filter(t => t.status === 'completed');

      let html = '';
      if (pending.length) {
        html += `<div class="task-group"><div class="task-group-title">待完成 (${pending.length})</div>${pending.map(t => Components.taskItem(t)).join('')}</div>`;
      }
      if (completed.length) {
        html += `<div class="task-group"><div class="task-group-title">已完成 (${completed.length})</div>${completed.map(t => Components.taskItem(t)).join('')}</div>`;
      }
      list.innerHTML = html;
    } catch (e) {
      console.error('加载失败:', e);
      list.innerHTML = '<div class="page-error">加载失败: ' + (e.message || '') + '</div>';
    }
  }

  static async toggle(taskId) {
    try {
      await api.put(`/task/${taskId}`, { status: 'completed' });
      Components.toast('已完成');
      App.loadPage('tasks');
    } catch (e) {
      Components.toast('操作失败');
    }
  }

  static async showAddModal() {
    const sheet = Components.bottomSheet({
      title: '添加待办',
      content: `
        <div class="form-group">
          <input class="form-input" id="taskTitle" placeholder="待办事项">
        </div>
        <div class="form-group">
          <textarea class="form-input" id="taskDesc" rows="2" placeholder="备注（可选）"></textarea>
        </div>
      `,
      actions: [
        { text: '取消', class: 'btn-outline' },
        { text: '添加', class: 'btn-primary' }
      ]
    });
    sheet.classList.add('show');
  }
}

App.register('tasks', new TasksPage());
window.TasksPage = TasksPage;
