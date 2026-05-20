// 在浏览器控制台执行的测试脚本
(async () => {
  // 1. 登录
  const loginRes = await fetch('https://wenzhang.dingdingoa.cn/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'mima2012' })
  });
  const login = await loginRes.json();
  console.log('登录结果:', login);
  const token = login.data.token;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(login.data.user));

  // 2. 创建测试图片文件
  const imgBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  const imgBytes = Uint8Array.from(atob(imgBase64), c => c.charCodeAt(0));
  const imgFile = new File([imgBytes], 'test.png', { type: 'image/png' });

  // 3. 上传图片
  const formData = new FormData();
  formData.append('image', imgFile);
  const uploadRes = await fetch('https://wenzhang.dingdingoa.cn/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const upload = await uploadRes.json();
  console.log('上传结果:', upload);

  // 4. 发布文章
  const articleRes = await fetch('https://wenzhang.dingdingoa.cn/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: '图片上传测试文章',
      content: `# 测试图片\n\n![测试图片](${upload.data?.url || upload.url})\n\n这是一篇测试文章，验证图片上传功能是否正常。`,
      summary: '验证图片上传和文章发布功能',
      status: 'published'
    })
  });
  const article = await articleRes.json();
  console.log('文章创建结果:', article);

  if (article.success) {
    alert(`测试成功！文章ID: ${article.data.id}\n图片URL: ${upload.data?.url || upload.url}`);
  }
})();
