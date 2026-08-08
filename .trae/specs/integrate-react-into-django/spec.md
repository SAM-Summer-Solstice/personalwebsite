# React 前端集成到 Django（Integrate React into Django）Spec

## Why
项目已有独立 React 前端（Vite，:5175）与 Django 后端（:8000，SimpleUI 后台）。目前 Django 根路径显示默认欢迎页，前台与后台分离、体验割裂。目标：**Django 直接托管 React 构建产物**，访问 :8000 即进入 React 前台，`/admin/` 仍为 SimpleUI 后台——前后端统一入口、单一服务器部署。

现状确认（基于代码）：
- 前端为单入口 SPA：`src/main.jsx` 直接 render `<App/>`，导航由 `ContentArea` 的 `activeTab` state 切换，**无 URL 路由**；vite 默认 `base: '/'`，构建产物 `dist/`（`index.html` + `assets/`，`dist/` 已在 `.gitignore`）
- Django `urls.py` 仅 `admin/`；前端 `src/api.js` 用同源相对路径 `fetch('/api/views/...')`，失败时降级 mock（fail-open）

## What Changes
- **新增 `content/views.py` 的 `react_spa` 视图**：按请求路径在 React dist 目录定位文件，命中文件直接返回（`/assets/...` 等静态资源），否则返回 `index.html`（SPA 入口回退，兼容未来引入 Router）
- **`blog_backend/urls.py`**：保留 `admin/`；末尾追加 SPA catch-all 路由（负向前瞻排除 `admin|static|api`），使 Django 后台、admin 静态资源、未来 API 不被前台兜底吞掉
- **`blog_backend/settings.py`**：新增 `REACT_DIST` 指向前端构建产物（项目根 `dist/`）；Django 静态系统继续服务 SimpleUI/admin 静态资源
- **前端代码零改动**：仅需重新 `npm run build` 生成最新产物
- **验证**：访问 :8000 → React 前台；:8000/admin/ → SimpleUI 中文后台；静态资源 200；未命中路径回退 index.html；/api/* 不被拦截
- **已知边界**：集成后 `/api/views/*` 由 Django 接收但当前未实现 → 前端按现有 fail-open 机制降级显示 mock 浏览量（不报错）；浏览量 API 迁移到 Django 属后续独立任务

## Impact
- Affected specs: 新增（前后端集成部署）
- Affected code:
  - `server/django/blog_backend/urls.py`（SPA catch-all）
  - `server/django/blog_backend/settings.py`（`REACT_DIST`）
  - `server/django/content/views.py`（`react_spa` 视图）
  - 前端：无代码改动（仅重新 build）

## ADDED Requirements

### Requirement: Django 托管 React 前台
系统 SHALL 在 Django 根路径返回 React 构建的前台页面，替代 Django 默认欢迎页。

#### Scenario: 访问站点根路径
- **WHEN** 用户访问 `http://127.0.0.1:8000/`
- **THEN** 返回 React 构建产物 `index.html` 及其静态资源，显示 React 前台（非 Django 欢迎页）

### Requirement: 后台与静态资源不受影响
系统 SHALL 保持 `/admin/` 为 SimpleUI 后台，并正常服务其静态资源。

#### Scenario: 访问管理后台
- **WHEN** 管理员访问 `http://127.0.0.1:8000/admin/`
- **THEN** 仍为 SimpleUI 中文后台；`/static/` 下的 SimpleUI/admin 资源正常加载

### Requirement: SPA 路由回退
系统 SHALL 对未命中静态文件的路径回退到 `index.html`。

#### Scenario: 直接访问前台任意路径
- **WHEN** 用户直接访问前台任意非文件路径（未来启用 URL 路由后）
- **THEN** 返回 `index.html`，由前端接管渲染

### Requirement: API 路径预留
系统 SHALL 不将 `/api/*` 纳入 SPA 兜底，留给未来 Django API。

#### Scenario: 请求 API
- **WHEN** 前端或其他客户端请求 `/api/views/...`
- **THEN** 请求不被 SPA catch-all 拦截（当前返回 404，前端按 fail-open 降级 mock 浏览量，不崩溃）

## MODIFIED Requirements
无

## REMOVED Requirements
无
