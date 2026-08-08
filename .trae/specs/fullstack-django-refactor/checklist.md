# Checklist

- [ ] 后台（`:8000/admin/`）可新建/编辑帖子与项目：Markdown 编辑器 + 实时预览 + 图片上传至服务器（MEDIA）
- [ ] `/api/posts`、`/api/posts/<id>/`、`/api/projects`、`/api/about` 返回正确 JSON
- [ ] `POST /api/views/<id>/` 浏览量计数生效，前端列表/详情显示服务器值（会话内一次计数）
- [ ] `python manage.py import_md` 将存量 6 posts + 6 projects（含 views/likes）完整导入 DB
- [ ] 前端 URL 路由：`/`、`/posts`、`/posts/:id`、`/projects`、`/about` 可访问；深链接直接打开、刷新保留、浏览器前进后退正常
- [ ] 前端内容来自 API（无构建期 md 打包残留：`src/data/posts.js`/`projects.js` 不再 import.meta.glob）
- [ ] `:8000/` 显示 React 前台，`:8000/admin/` SimpleUI 中文后台，`:8000/media/*` 上传资源可访问
- [ ] 3D 星图 / 吊牌 / 终端 / GSAP 动效 / 导航联动无回归；控制台无错误
- [ ] `npm run build` 与 `manage.py check` 通过
