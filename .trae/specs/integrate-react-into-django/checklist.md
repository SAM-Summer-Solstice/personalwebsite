# Checklist

- [ ] `http://127.0.0.1:8000/` 显示 React 前台（非 Django 默认欢迎页），页面可交互
- [ ] `http://127.0.0.1:8000/admin/` 仍为 SimpleUI 中文后台，`/static/` 资源正常
- [ ] React 静态资源（`/assets/*`）返回 200，无 404
- [ ] 未命中文件的路径回退 `index.html`（SPA 兼容）
- [ ] `/api/*` 不被 SPA catch-all 拦截（返回 404 而非 index.html）
- [ ] React 前台导航 / 3D 星图 / 吊牌 / GSAP 动效无回归，控制台无错误
- [ ] `npm run build` 通过；Django `manage.py check` 通过
