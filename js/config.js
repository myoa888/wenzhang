// API配置
// Workers部署成功后，修改为实际的Workers URL

const API_BASE = 'https://wenzhang.dingdingoa.cn/api';
const VERSION = '1.0.6';

function loadFooter() {
  fetch('footer.html')
    .then(r => r.text())
    .then(html => document.getElementById('footer-placeholder').outerHTML = html);
}
