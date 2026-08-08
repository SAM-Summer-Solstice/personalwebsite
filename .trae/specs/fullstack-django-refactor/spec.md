# Django 全栈重构：内容后端化 + URL 路由（Fullstack Django Refactor）Spec

## Why
用户决定放弃"本地编辑 md + 重新构建"的内容维护方式，改为**通过后台友好地编辑帖子**；同时希望浏览量、评论、用户系统都有更成熟的方案，并确认"类似百度贴吧这类资源（内容/图片/附件）是否都保存在服务器上"。

现状确认：
- 前端（React + Vite）数据源为 `content/*.md`，经 `import.meta.glob({eager})` **构建期打包**进 JS bundle（[posts.js](src/data/posts.js) / [projects.js](src/data/projects.js)）；内容固话在前端，后端对内容一无所知，无法后台编辑
- 前端**无 URL 路由**（state 导航）：刷新丢状态、无深链接、浏览器前进后退失效、不可分享单篇
- 浏览量/点赞存于 md frontmatter（静态），另有一个 Node server（:3210）提供浏览量 API，两套并存
- 评论用 Giscus（GitHub 驱动），资源在 GitHub 而非自有服务器

目标架构（借鉴成熟模式：**DRF + React 标准前后端分离**、**Django admin + Markdown 编辑器**、**服务端媒体存储**——主流博客/贴吧均为"资源存服务器、前端动态拉取"）：

```
[浏览器]
 ├─ React SPA（:8000，Django 托管）
 │    └─ react-router:  /  /posts  /posts/:id  /projects  /about
 │    └─ fetch /api/*   ← 内容/浏览量/评论全部动态来自服务器
 └─ 后台 /admin/（SimpleUI + Markdown 编辑器，图片上传→服务器 MEDIA）
Django（:8000）
 ├─ /admin/   内容管理（Post/Project/About 模型 + django-markdownx + 图片上传）
 ├─ /api/     DRF（posts 列表/详情、projects、about、views 计数）
 ├─ /media/   用户上传资源（存服务器磁盘 MEDIA_ROOT）
 ├─ /static/  SimpleUI/admin 静态
 └─ /*        React build（SPA fallback 回 index.html）
数据库 SQLite（初始，可后续迁 PostgreSQL）
```

**范围决策**（用户已确认）：内容数据层迁 Django API；引入 URL 路由。
**分阶段**：本 spec 实施 **Phase 1**（内容后端化 + 路由 + 浏览量 API + 后台编辑）；**Phase 2**（评论自建 + 用户系统）作为明确规划但另行实施，避免一次改动过大写成"屎山"。

## What Changes

### Phase 1（本次实施）
- **Django 内容模型**（`content/models.py`）：`Post`（id/slug/title/date/tags/excerpt/content Markdown/views/likes）、`Project`（现 md 字段全集）、`About`（个人信息/联系/方向/兴趣/简介/统计/博客初衷）
- **后台编辑**：`content/admin.py` 注册三模型 + `django-markdownx` Markdown 编辑器（帖子弹窗实时预览、图片上传到 `MEDIA_ROOT`，服务器存储）；新增依赖 `djangorestframework`、`django-markdownx`
- **数据迁移**：`manage.py import_md` 一次性从 `content/posts|projects/*.md` 导入初始数据到 DB（保留 views/likes frontmatter 值）
- **DRF API**：`content/serializers.py` + `views.py` 提供 `GET /api/posts`、`GET /api/posts/<id>/`、`GET /api/projects`、`GET /api/about`、`POST /api/views/<id>/`（浏览量 +1，沿用现有语义）
- **前端 URL 路由**：引入 `react-router-dom`；路由表 `/(home)`、`/posts`、`/posts/:id`（单篇）、`/projects`、`/about`；导航、终端联动、首页跳转均改为路由驱动
- **前端数据层**：`posts/projects/about` 由"构建期 import"改为 `fetch /api/*`（轻量 hooks + 现有 fail-open 降级）；浏览量/点赞读写改为调 API；Markdown 渲染（marked）保留，渲染 API 返回的正文
- **Django 托管集成**：`react_spa` 视图 serve React build（`dist/`）+ SPA catch-all（排除 `admin|api|media|static`）；`settings.py` 配 `REACT_DIST`、`MEDIA_URL/MEDIA_ROOT`、`REST_FRAMEWORK`
- **终端适配**：`commands.js` 数据引用改为异步注入（posts/projects/about 由 App 级加载后传入）

### Phase 2（规划，另行实施，不写入本 spec 任务）
- 评论自建：`Comment` 模型存服务器（对应"资源存服务器"理念），审核/删除走后台；替换或并存 Giscus
- 用户系统：DRF 注册/登录（JWT），点赞/评论需登录
- 数据库升级：SQLite → PostgreSQL（可选）

## Impact
- Affected specs: 新增（全栈重构）；关联既有 `content-management`（内容从 md 迁移到 DB）
- Affected code:
  - 后端：`server/django/content/`（models/admin/serializers/views/管理命令）、`server/django/blog_backend/`（settings/urls）
  - 前端：`src/App.jsx`（Router）、`src/data/*`（fetch 化）、`src/components/sections/*`（数据来源）、`src/terminal/commands.js`（异步数据）、`src/api.js`（浏览量 API）、`src/components/Navbar.jsx`/`Terminal.jsx`（路由联动）
  - 配置：`package.json`（+react-router-dom）、`server/django`（+DRF、+markdownx）

## ADDED Requirements

### Requirement: 后台友好编辑内容
系统 SHALL 提供 Django 后台编辑帖子/项目/个人信息，支持 Markdown 与图片上传。

#### Scenario: 管理员后台发布新帖
- **WHEN** 管理员在 `:8000/admin/` 编辑/新建帖子
- **THEN** 可使用 Markdown 编辑器（实时预览），插入的图片上传至服务器 `MEDIA_ROOT`；保存后前台 `GET /api/posts` 立即可见

### Requirement: 内容由 API 动态提供
系统 SHALL 由 Django API 提供全部内容，前端动态拉取（服务端内容模式，同贴吧/主流博客）。

#### Scenario: 前端加载文章列表/详情
- **WHEN** 用户访问 `/posts` 或 `/posts/:id`
- **THEN** 前端 `fetch /api/posts` / `/api/posts/<id>/` 获取数据渲染；无构建期 md 打包

### Requirement: URL 路由与深链接
系统 SHALL 引入 URL 路由，每篇文章/页面有可分享、可刷新的 URL。

#### Scenario: 分享与刷新单篇文章
- **WHEN** 用户打开 `/posts/<id>`、刷新、或直接粘贴该 URL 访问
- **THEN** 页面正确渲染该文章；浏览器前进/后退可用；Django 对未知路径回退 `index.html`

### Requirement: 浏览量走服务器
系统 SHALL 由 Django 记录浏览量，前端读写该 API。

#### Scenario: 阅读计数
- **WHEN** 用户打开一篇文章
- **THEN** 前端调用 `POST /api/views/<id>/`，页面显示服务器返回的浏览数（沿用会话内一次计数语义）

### Requirement: 初始数据迁移
系统 SHALL 提供一次性命令，将现有 md 内容导入数据库。

#### Scenario: 迁移存量内容
- **WHEN** 执行 `python manage.py import_md`
- **THEN** 现有 6 篇 posts 与 6 个 projects 及浏览量/点赞数完整进入 DB

## MODIFIED Requirements
无（全新架构引入）

## REMOVED Requirements
### Requirement: 构建期 md 打包（现状）
**Reason**: 内容固化在前端 bundle，无法后台编辑、后端不可知。
**Migration**: 由 `content/*.md` 一次性迁移到 Django DB；后续内容通过后台编辑；`src/data/posts.js` / `projects.js` 改为 API 数据源。

### Requirement: Node 浏览量服务（server/index.js）
**Reason**: 浏览量职责并入 Django API，消除两套后端。
**Migration**: `POST /api/views/<id>/` 由 Django 实现；前端 `api.js` 指向同源 API。
