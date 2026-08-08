# Tasks

- [ ] Task 1: Django 托管 React 构建产物
  - [ ] SubTask 1.1: `blog_backend/settings.py` 新增 `REACT_DIST = BASE_DIR.parent.parent / "dist"`（指向前端构建产物）
  - [ ] SubTask 1.2: `content/views.py` 新增 `react_spa` 视图：按路径在 `REACT_DIST` 定位文件，命中返回文件，否则返回 `index.html`
  - [ ] SubTask 1.3: `blog_backend/urls.py` 保留 `admin/`，末尾追加 SPA catch-all（负向前瞻排除 `admin|static|api`，如 `re_path(r"^(?!admin|static|api).*", react_spa)`）
- [ ] Task 2: 构建与集成验证
  - [ ] SubTask 2.1: 前端 `npm run build` 生成最新 `dist/`
  - [ ] SubTask 2.2: 重启 Django 服务器并验证：`:8000/` 显示 React 前台（非欢迎页）、`:8000/admin/` SimpleUI 中文后台正常、React 静态资源 `/assets/...` 返回 200、未命中路径回退 `index.html`、`/api/*` 不被 catch-all 拦截、React 前台导航/3D/动效无回归

# Task Dependencies
- [Task 2] 依赖 [Task 1]
