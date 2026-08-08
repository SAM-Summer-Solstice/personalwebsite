# Tasks

- [ ] Task 1: Django 内容模型与后台编辑
  - [ ] SubTask 1.1: 安装依赖 `djangorestframework`、`django-markdownx`（阿里云镜像）；`settings.py` 配置 `INSTALLED_APPS`（rest_framework/markdownx）、`MEDIA_URL/MEDIA_ROOT`、`REST_FRAMEWORK`
  - [ ] SubTask 1.2: `content/models.py` 定义 `Post`（slug/title/date/tags/excerpt/content/views/likes）、`Project`（name/emoji/tagline/description/tech/status/date/url/github/related）、`About`（个人信息全字段）
  - [ ] SubTask 1.3: 建表迁移 `makemigrations` + `migrate`
  - [ ] SubTask 1.4: `content/admin.py` 注册三模型，帖子正文用 `markdownx` Markdown 编辑器（含图片上传到 MEDIA）
  - [ ] SubTask 1.5: 管理命令 `content/management/commands/import_md.py`：读取 `content/posts/*.md` 与 `content/projects/*.md`，导入为 Post/Project（保留 views/likes），并写入 About 初始数据
- [ ] Task 2: DRF API
  - [ ] SubTask 2.1: `content/serializers.py`：Post/Project/About 序列化器
  - [ ] SubTask 2.2: `content/views.py`：`GET /api/posts`、`GET /api/posts/<id>/`、`GET /api/projects`、`GET /api/about`、`POST /api/views/<id>/`（浏览量 +1）
  - [ ] SubTask 2.3: `blog_backend/urls.py` 挂载 `/api/`；验证 API 返回 JSON
- [ ] Task 3: 前端 URL 路由与 API 数据层
  - [ ] SubTask 3.1: 安装 `react-router-dom`；`App.jsx` 改为 Router：`/`(home)、`/posts`、`/posts/:id`、`/projects`、`/about`；导航（Navbar/Terminal/首页跳转）改路由驱动；保留/适配深链接直接访问
  - [ ] SubTask 3.2: 数据层 fetch 化：`posts/projects/about` 改为 `fetch /api/*` 的 hooks；单篇详情按 `:id` 拉取；浏览量读写走 API（沿用会话内一次计数）；保留 fail-open 降级
  - [ ] SubTask 3.3: 适配消费方：`HomeSection/BlogSection/ProjectsSection/AboutSection/MarkdownBody/Terminal commands.js` 改用异步数据源；3D 星图/吊牌/GSAP 动效不回归
- [ ] Task 4: Django 托管集成
  - [ ] SubTask 4.1: `react_spa` 视图（`content/views.py`）serve React build（`REACT_DIST`）+ SPA catch-all（排除 `admin|api|media|static`）
  - [ ] SubTask 4.2: `settings.py` 配 `REACT_DIST`；`urls.py` 挂载 `/media/` 与 catch-all
  - [ ] SubTask 4.3: 前端 `npm run build`；启动 Django 验证 `:8000/` React 前台、`:8000/admin/` 后台
- [ ] Task 5: 回归与验证
  - [ ] SubTask 5.1: `manage.py import_md` 迁移存量（6 posts + 6 projects）成功
  - [ ] SubTask 5.2: 浏览器回归：首页/列表/详情由 API 数据渲染且浏览量显示服务器值；URL 深链接、刷新、前进后退正常；后台可新建/编辑帖子并上传图片（存服务器）；`/api/*` 返回 JSON；3D 星图/吊牌/终端/GSAP 动效无回归；控制台无错误

# Task Dependencies
- [Task 2] 依赖 [Task 1]（模型先行）
- [Task 3] 依赖 [Task 2]（API 先行，前端可并行搭路由骨架）
- [Task 4] 依赖 [Task 3]（build 后托管）
- [Task 5] 依赖 [Task 1..4]
