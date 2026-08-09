# 核桃派部署（Deploy to WalnutPi）Spec

## Why
把博客从本地迁移到核桃派（10.83.36.241）作为生产服务器。当前代码仅开发模式可用（DEBUG 下 dev server 服务 static/media），且依赖本地运行；需要生产化改造（Nginx + Gunicorn + 生产配置）后部署到 ARM 设备。

**核桃派实测环境**（2026-08 探测）：
- OS：Debian GNU/Linux 12 (bookworm)，aarch64（ARM 64 位）
- 资源：4 核 / **内存仅 981MiB**（docker 服务占用中）/ eMMC 59GB（用 4.8G，mmcblk0）
- 运行时：**Python 3.11.2**（有 pip 23.0.1）；**无 Node/npm**（不需要——前端在本地构建，Django 托管静态）
- 网络：内网 10.83.36.241 + **Tailscale 已激活**（100.93.171.11，异网可访问）
- 软件源：apt（清华）、pip 均可用；nginx/gunicorn 未安装；docker 在运行

## What Changes

### 部署架构（与开发架构一致，仅生产化）
```
浏览器 → Nginx(:80) ── 静态/媒体: /static /media /assets + SPA fallback(index.html)
                   └── 反代: /api /admin /markdownx → Gunicorn(127.0.0.1:8000, 2 workers)
                                                            └─ Django(DEBUG=False) + SQLite + media/
```

### 本地（Windows 开发机）
- 前端 `npm run build` 生成最新 `dist/`（React 同源 `/api`，**前端代码零改动**）
- 将 `server/django/`（代码，不含 `.venv`、`db.sqlite3` 可选）与 `dist/` 传送到核桃派（scp/rsync 或 git）
- 提供部署清单脚本，可重复执行

### 核桃派环境准备
- `apt` 安装：`nginx`、`python3-venv`（其余系统包已有）
- 创建 venv（python3.11）+ `pip install -r requirements.txt`（Django/DRF/markdownx/simplejwt，走清华 pip 镜像；ARM 有 wheel）
- 可停用 docker 服务释放内存（可选，约 300MB）

### Django 生产化（**BREAKING：仅生产生效，开发模式不变**）
- `DEBUG=False`、`ALLOWED_HOSTS=["10.83.36.241","100.93.171.11","localhost"]`
- `SECRET_KEY` 从环境变量读取（不落仓库）；`CSRF_TRUSTED_ORIGINS` 按访问地址配置
- `STATIC_ROOT` + `collectstatic`（admin/simpleui/markdownx 静态收拢，Nginx 服务）
- `REACT_DIST` 指向部署的 `dist/`
- 数据：迁移现库（拷贝 `db.sqlite3` + `media/`，或在核桃派执行 `import_md` + 重建后台）

### 服务管理
- **Gunicorn**：2 workers（1GB 内存上限），systemd 单元开机自启/崩溃自重启
- **Nginx**：监听 80；`/static /media /assets` 直接服务，未知路径 `try_files ... /index.html`（SPA fallback），`/api /admin /markdownx` 反代 8000

### 访问与安全
- 访问：局域网 `http://10.83.36.241/`；异网 `http://100.93.171.11/`（Tailscale）
- **必须改 `pi` 密码**（当前 pi/pi 极不安全）；启用 SSH 密钥登录（可后续）
- 防火墙（ufw）：仅开放 80/22 或仅局域网
- 备份：crontab 定期备份 `db.sqlite3` + `media/`

## Impact
- Affected specs: 新增（部署）
- Affected code: 后端新增生产配置支持（`settings.py` 按环境变量切换、`requirements.txt`、部署脚本）；前端零改动；开发模式行为不变
- 说明：`react_spa` 视图保留（开发兜底），生产由 Nginx 接管静态

## ADDED Requirements

### Requirement: 生产站点可通过 80 端口访问
系统 SHALL 部署后经核桃派 80 端口提供完整站点。

#### Scenario: 访问前台
- **WHEN** 浏览器访问 `http://10.83.36.241/`（或 Tailscale 地址）
- **THEN** 返回 React 前台（SPA、路由、3D/动效正常），非 Django 开发页

#### Scenario: 访问后台
- **WHEN** 访问 `http://10.83.36.241/admin/` 并登录
- **THEN** SimpleUI 中文后台可用，markdownx 实时预览、图片/附件上传到核桃派 `media/` 生效

### Requirement: API 与互动功能在生产可用
系统 SHALL 在生产环境完整提供全部 API 与互动功能。

#### Scenario: 生产 API 与互动
- **WHEN** 前台调用 `/api/*`（posts/projects/about/views/comments/like/register/token/me）
- **THEN** 均正常；登录/注册、评论、点赞、附件下载可用

### Requirement: 服务自恢复
系统 SHALL 崩溃或重启后自动恢复服务。

#### Scenario: 服务重启
- **WHEN** 核桃派重启或 Gunicorn 进程退出
- **THEN** systemd 自动拉起 Gunicorn 与 Nginx

### Requirement: 生产安全基线
系统 SHALL 部署后不暴露开发弱密码与 DEBUG 信息。

#### Scenario: 安全检查
- **WHEN** 检查生产配置
- **THEN** `pi` 密码已更改、`DEBUG=False`、SECRET_KEY 来自环境变量、防火墙仅开放必要端口

### Requirement: 数据可备份
系统 SHALL 提供数据库与媒体文件的定期备份机制。

#### Scenario: 备份执行
- **WHEN** 按计划执行备份
- **THEN** `db.sqlite3` 与 `media/` 被复制到备份位置（crontab）

## MODIFIED Requirements
无

## REMOVED Requirements
无
