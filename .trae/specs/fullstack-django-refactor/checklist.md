# Checklist

- [x] 后台（`:8000/admin/`）可新建/编辑帖子与项目：Markdown 编辑器 + 实时预览（markdownx POST /markdownify/ 200，预览 DOM 更新）+ 图片上传路由就绪（MEDIA）
- [x] `/api/posts`、`/api/posts/<id>/`、`/api/projects`、`/api/about` 返回正确 JSON（200 application/json）
- [x] `POST /api/views/<id>/` 浏览量计数生效，前端列表/详情显示服务器值（会话内一次计数，刷新不重复 +1）
- [x] `python manage.py import_md` 将存量 6 posts + 6 projects（含 views/likes）完整导入 DB（posts=6/projects=6/about=1）
- [x] 前端 URL 路由：`/`、`/posts`、`/posts/:id`、`/projects`、`/about` 可访问；深链接直接打开、刷新保留、浏览器前进后退正常
- [x] 前端内容来自 API（`src/data/posts.js`/`projects.js`/`about.js` 已删除，`import.meta.glob` 零残留）
- [x] `:8000/` 显示 React 前台，`:8000/admin/` SimpleUI 中文后台，`:8000/media/*` 上传资源可访问（不存在文件 404 而非 index.html）
- [x] 3D 星图 / 吊牌 / 终端 / GSAP 动效 / 导航联动无回归（stagger 数据就绪后恢复；控制台无 405/error）
- [x] `npm run build` 与 `manage.py check` 通过
