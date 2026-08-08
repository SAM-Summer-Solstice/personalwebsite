# Agent.md — 项目开发规范与长期记忆

> 本文件是项目的"长期记忆"：新会话 / 新 Agent 启动时优先阅读，避免因上下文过长而失忆。
> 修改架构、约定、命令时请同步更新本文件。

## 1. 项目概述

「拾光日志」个人博客——一个**混合终端**风格的站点：上半部分是内容区，下半部分是真实可交互的终端。用户是一位机器人/运动控制/具身智能方向的学生（余一干，hero 名暂用"小拾"）。主打高端设计师作品集观感 + 克制高级的 GSAP 动效。

**当前形态：前后端分离，单一服务器部署。**

## 2. 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 前端 | React 19 + Vite 8 + react-router-dom 7 | package.json |
| 3D | @react-three/fiber + drei + rapier（物理）+ three | package.json |
| 动效 | GSAP 3 + ScrollTrigger | package.json |
| 前端渲染 | marked（Markdown → HTML） | package.json |
| 后端 | Django 5.2.4 + DRF + django-markdownx + djangorestframework-simplejwt | server/django/.venv |
| 后台 | SimpleUI（中文）+ markdownx Markdown 编辑器 | 同上 |
| 数据库 | SQLite（`server/django/db.sqlite3`），未来可迁 PostgreSQL | — |
| 认证 | JWT（access 7 天，localStorage `blog_token`） | simplejwt |

## 3. 架构

```
[浏览器]
 ├─ React SPA（:8000，Django 托管，SPA fallback 回 index.html）
 │    └─ react-router:  /  /posts  /posts/:id  /projects  /about
 │    └─ fetch /api/*（内容/浏览量全部动态来自服务器）
 └─ 后台 /admin/（SimpleUI 中文 + Markdown 编辑器 + 图片上传）
Django（:8000）
 ├─ /admin/   内容管理（Post/Project/About/Attachment 内联/Comment 审核）
 ├─ /api/     DRF（posts/projects/about/views + register/token/me + comments/like/attachments）
 ├─ /markdownx/ 后台编辑器预览/图片/视频上传
 ├─ /media/   用户上传资源（图片/视频/附件，存服务器磁盘）
 ├─ /static/  SimpleUI/admin 静态
 └─ /*        React build（catch-all → index.html）
```

**前端数据流**：`src/data/useContent.js` 的 hooks（usePosts/usePost/useProjects/useAbout）fetch `/api/*` → 各 section 消费；**无构建期内容打包**（已废弃 `import.meta.glob` 的 md 数据层）。

**用户认证**：`src/auth/AuthContext.jsx`（AuthProvider + useAuth）——token 存 localStorage，登录/注册弹窗为 `src/components/AuthModal.jsx`（App 级渲染，任意组件 `useAuth().openAuth()` 打开）；未登录点赞/评论在前端直接拦截弹窗，不发请求。

**动效初始化**：`ContentArea.jsx` 监听 `app:content-ready` 事件（useContent 数据就绪时 dispatch），切页重置 epoch，数据渲染完成后才执行 `initPageMotion`——保证异步内容也能正确创建 GSAP 动画。

## 4. 目录结构

```
├── src/                     # React 前端
│   ├── App.jsx              # BrowserRouter + AuthProvider + AppShell（activeTab 由 URL 推导）
│   ├── api.js               # fetch /api/*（BASE='/api'，自动带 Bearer token）
│   ├── auth/AuthContext.jsx # 用户认证上下文（登录/注册/退出/弹窗开关）
│   ├── data/useContent.js   # 数据 hooks（唯一数据源入口）
│   ├── motion/usePageMotion.js  # GSAP + ScrollTrigger 动效系统
│   ├── components/          # Navbar/ContentArea/Terminal/Dither/Lanyard/AuthModal/CommentSection/.../sections/
│   ├── terminal/commands.js # 终端命令引擎（数据由 App 注入 ctx）
│   └── preload.js           # 3D 资源空闲预取
├── content/posts|projects/  # 【已迁移完成】旧 md 数据源，仅作 git 历史
├── server/django/           # Django 后端
│   ├── blog_backend/        # settings.py / urls.py
│   ├── content/             # models/admin/serializers/views/urls + management/commands/import_md.py
│   └── .venv/               # Python 3.12.7 虚拟环境
├── server/index.js          # 【已弃用】旧 Node 浏览量服务（可删）
├── dist/                    # 前端构建产物（gitignore）
└── .trae/specs/             # spec 驱动开发的历史文档（含决策记录）
```

## 5. 核心约定（开发规范）

1. **代码注释用中文**；命名统一现有风格（组件 PascalCase、变量 camelCase、CSS BEM-ish、数据属性 `data-xxx`）。
2. **前端禁止 `import.meta.glob` 打包内容**；内容一律来自 `/api/*`。
3. **动效**：
   - 只操作 `transform / opacity / clip-path`，不触发 layout；
   - `gsap.from` 初始隐藏态由 JS 运行时注入（fail-open：脚本失败内容可见）；
   - stagger 默认 `STAGGER_LIMIT=6` 克制化，容器可用 `data-stagger-limit="N"` 覆盖；
   - 动效初始化必须等数据就绪（见 §3 事件机制），不要恢复旧的 useLayoutEffect 直跑。
4. **3D**：lazy 加载 + 可视才挂载（IntersectionObserver）+ rIC 空闲挂载 + dpr 上限 1.5（ProjectsNetwork / Lanyard 同规）。
5. **React 不要用 StrictMode**：会双重挂载 `<Canvas>` 导致 R3F 渲染循环停止。
6. **后端**：API 视图用 DRF `@api_view`；模型字段 `views/likes` 用 PositiveInteger；对外 `id` 用 slug（沿用旧 md 的 id）。
7. **URL 路由**：新增页面必须在 `App.jsx` 路由表登记，并确认 Django catch-all 正则 `^(?!admin|api|media|static|markdownx)(?P<path>.*)` 不会吞掉新路径前缀。
8. **提交规范**：内容（帖子/项目）改动 = 后台编辑 + 数据库迁移，不靠改 md 文件；代码改动遵循 git 常规（仅用户要求时提交）。

## 6. 常用命令

```powershell
# 前端
npm run dev          # Vite dev（:5175，/api 代理到 :8000）
npm run build        # 构建到 dist/（Django 托管的就是它，改前端后必须重新 build）

# Django 后端（cwd = server/django，venv 已忽略）
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000   # 启动（StatReloader 自动重载）
.\venv\Scripts\python.exe manage.py makemigrations
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py import_md                 # 一次性：md → DB（已有数据时幂等 update_or_create）
.\venv\Scripts\python.exe manage.py createsuperuser           # 或 shell 里创建

# 激活 venv（PowerShell）
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; .\venv\Scripts\Activate.ps1

# Python 包安装（阿里云镜像；清华 403 不可用）
.\venv\Scripts\python.exe -m pip install <pkg> -i https://mirrors.aliyun.com/pypi/simple/
```

## 7. 内容管理（重要）

- **写内容 = 后台**：登录 `:8000/admin/`（超级管理员 SamXu / 密码见会话记录），帖子用 markdownx Markdown 编辑器（实时预览、图片上传到 `media/`）。保存后前台 `/api/posts` 立即可见。
- **模型**：Post（slug/title/date/tags/excerpt/content/views/likes/comments）、Project（name/emoji/tagline/description/tech/status/date/url/github/related）、About（单例，个人资料）。
- `content/*.md` 是历史数据源，仅在需要回滚/重新导入时使用 `import_md`。

## 8. API 契约

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/posts/` | GET | 列表（date 倒序，无 content）`[{id,slug,title,date,tags[],excerpt,views,likes,comments[]}]` |
| `/api/posts/<slug>/` | GET | 详情（含 `content` Markdown） |
| `/api/projects/` | GET | 项目列表 |
| `/api/about/` | GET | 个人信息 `{name,school,grade,birthYear,intro[],directions[],interests[],stats[],contact{},blogPurpose[]}` |
| `/api/views/<slug>/` | POST | 浏览量 +1，返回 `{views}`（前端会话内一次计数） |
| `/api/register/` | POST | 注册 `{username,password,email?}` → 201 |
| `/api/token/` | POST | 登录 `{username,password}` → `{access,refresh}` |
| `/api/me/` | GET | 当前用户（Bearer）→ `{id,username,is_staff,is_superuser}` |
| `/api/posts/<slug>/comments/` | GET/POST | 评论列表 / 发表（POST 需 Bearer，`{content}`） |
| `/api/posts/<slug>/like/` | POST | 点赞切换（需 Bearer）→ `{likes,liked}` |
| `/api/posts/<slug>/attachments/` | POST | 附件上传（需 Bearer，multipart file/name） |
| `/api/attachments/<id>/download/` | GET | 附件下载（流式） |

## 9. 踩坑记录（失忆防护）

1. **本机 Python**：`python`（TRAE 内置）无 venv 模块；创建 venv 必须用 `D:\anaconda3\python.exe -m venv`。
2. **pip 镜像**：清华 403、官方 pypi 超时 → 一律用阿里云镜像。
3. **Django startproject 名字校验**：`python -m django startproject <通用名>` 会误报冲突（backend/api/blog 等）——用独特名（blog_backend）或手动补 manage.py。
4. **SPA catch-all 正则必须有 `(?P<path>.*)` 捕获组**，否则 `/assets/*.js` 全部误回退 index.html。
5. **markdownx 必须挂载 `path("markdownx/", include("markdownx.urls"))`**（放在 catch-all 前），否则后台预览/上传被吞。
6. **异步数据 + GSAP**：动效初始化必须等数据就绪（§3 事件机制），否则 data-stagger 子项缺失导致动画不创建。
7. **旧 Node 浏览量服务已弃用**：`server/index.js`、`src/api.js` 的 `getViews`（GET 接口）均已移除，不要恢复。
8. **SimpleUI 登录表单**：字段为 `input[name=username/password]`（非 Django 标准 `#id_username`），自动化脚本注意选择器。

## 10. 状态与下一步

- ✅ 已完成：全栈重构（内容后端化、URL 路由、浏览量 API、后台编辑、Django 托管、SimpleUI 中文后台）；Phase 2 主体（自建评论 + JWT 用户系统 + 点赞 + 附件上传/下载 + markdownx 视频上传；Giscus 已移除）
- 📌 规划（未实施）：评论审核后台加强、防垃圾（限流/封禁）、SQLite → PostgreSQL、树莓派部署（Gunicorn + Nginx + HTTPS，media/DB 勿放 SD 卡）
- ⚠️ 遗留可选：`@giscus/react` 依赖已无引用可移除；hero 姓名与管理员昵称不一致（后台可编辑）；Google Fonts 外网加载在受限网络下偏慢

## 11. 会话提示

- 改动前端后记得 `npm run build`（Django 托管的是 dist/，不 build 不生效）。
- Django 改 settings/urls/models 由 StatReloader 自动重载；改 INSTALLED_APPS 建议重启 runserver。
- 涉及动效/3D 的改动，回归时重点看：切页首帧、滚动触发动画、星图/吊牌挂载。
