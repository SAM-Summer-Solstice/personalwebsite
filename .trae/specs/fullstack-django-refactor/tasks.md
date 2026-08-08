# Tasks

- [x] Task 1: Django 内容模型与后台编辑
  - [x] SubTask 1.1: 安装依赖 `djangorestframework`、`django-markdownx`（阿里云镜像）；`settings.py` 配置 `INSTALLED_APPS`（rest_framework/markdownx）、`MEDIA_URL/MEDIA_ROOT`、`REST_FRAMEWORK`
  - [x] SubTask 1.2: `content/models.py` 定义 `Post`（slug/title/date/tags/excerpt/content/views/likes）、`Project`（name/emoji/tagline/description/tech/status/date/url/github/related）、`About`（个人信息全字段）
  - [x] SubTask 1.3: 建表迁移 `makemigrations` + `migrate`
  - [x] SubTask 1.4: `content/admin.py` 注册三模型，帖子正文用 `markdownx` Markdown 编辑器（含图片上传到 MEDIA）
  - [x] SubTask 1.5: 管理命令 `content/management/commands/import_md.py`：读取 `content/posts/*.md` 与 `content/projects/*.md`，导入为 Post/Project（保留 views/likes），并写入 About 初始数据（posts=6/projects=6/about=1）
- [x] Task 2: DRF API
  - [x] SubTask 2.1: `content/serializers.py`：Post/Project/About 序列化器
  - [x] SubTask 2.2: `content/views.py`：`GET /api/posts`、`GET /api/posts/<id>/`、`GET /api/projects`、`GET /api/about`、`POST /api/views/<id>/`（浏览量 +1）
  - [x] SubTask 2.3: `blog_backend/urls.py` 挂载 `/api/`；验证 API 返回 JSON
- [x] Task 3: 前端 URL 路由与 API 数据层
  - [x] SubTask 3.1: 安装 `react-router-dom`；`App.jsx` 改为 Router：`/`(home)、`/posts`、`/posts/:id`、`/projects`、`/about`；导航（Navbar/Terminal/首页跳转）改路由驱动；保留/适配深链接直接访问
  - [x] SubTask 3.2: 数据层 fetch 化：`posts/projects/about` 改为 `fetch /api/*` 的 hooks；单篇详情按 `:id` 拉取；浏览量读写走 API（沿用会话内一次计数）；保留 fail-open 降级
  - [x] SubTask 3.3: 适配消费方：`HomeSection/BlogSection/ProjectsSection/AboutSection/MarkdownBody/Terminal commands.js` 改用异步数据源；3D 星图/吊牌/GSAP 动效不回归
- [x] Task 4: Django 托管集成
  - [x] SubTask 4.1: `react_spa` 视图（`content/views.py`）serve React build（`REACT_DIST`）+ SPA catch-all（排除 `admin|api|media|static`，正则含 `(?P<path>.*)` 捕获组）
  - [x] SubTask 4.2: `settings.py` 配 `REACT_DIST`；`urls.py` 挂载 `/media/` 与 catch-all
  - [x] SubTask 4.3: 前端 `npm run build`；启动 Django 验证 `:8000/` React 前台、`:8000/admin/` 后台
- [x] Task 5: 回归与验证
  - [x] SubTask 5.1: `manage.py import_md` 迁移存量（6 posts + 6 projects）成功
  - [x] SubTask 5.2: 浏览器回归：首页/列表/详情由 API 数据渲染且浏览量显示服务器值；URL 深链接、刷新、前进后退正常；后台可新建/编辑帖子并上传图片（存服务器）；`/api/*` 返回 JSON；3D 星图/吊牌/终端/GSAP 动效无回归；控制台无错误（44 项通过，3 项真实问题 → Task 6）
- [x] Task 6: 修复回归发现的三个问题
  - [x] SubTask 6.1: 消除 405——前端 `BlogSection/PostMeta` 删除已无用的 `getViews()` 调用（列表浏览量直接用 API 返回的 `views`），`api.js` 同步清理 `getViews`
  - [x] SubTask 6.2: 修复异步数据渲染导致的卡片 stagger 失效——数据就绪后重新初始化动效：`useContent.js` 各 hook 数据就绪时 `dispatchEvent('app:content-ready')`；`ContentArea.jsx` 切页时重置动效 epoch、监听 content-ready（防抖合并）后执行 `initPageMotion`，保证动画在数据渲染完成后创建一次、不重播
  - [x] SubTask 6.3: 修复后台 markdownx 预览/上传——`blog_backend/urls.py` 在 catch-all 之前挂载 `path("markdownx/", include("markdownx.urls"))`
  - [x] SubTask 6.4: 浏览器复验：控制台无 405/error；`/posts` 卡片 stagger 入场动画恢复；后台正文编辑器实时预览与图片上传可用；无回归（三项修复全部复验通过：无 405/JS error、6 张卡片 stagger 0→1/30px→0、markdownx POST 200 + 预览更新、首页/单篇/星图/吊牌无回归）

# Task Dependencies
- [Task 2] 依赖 [Task 1]（模型先行）
- [Task 3] 依赖 [Task 2]（API 先行，前端可并行搭路由骨架）
- [Task 4] 依赖 [Task 3]（build 后托管）
- [Task 5] 依赖 [Task 1..4]
- [Task 6] 依赖 [Task 5]（回归发现的三项修复）
