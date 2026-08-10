# 核桃派部署（Deploy to WalnutPi）Spec

## Why
把博客从本地迁移到核桃派（10.83.36.241）作为生产服务器，并通过 **IPv6 公网 + 域名 `www.xuzixuan.top` + HTTPS** 对外提供访问。当前代码仅开发模式可用（DEBUG 下 dev server 服务 static/media），且依赖本地运行；需要生产化改造（Nginx + Gunicorn + 生产配置 + Let's Encrypt）后部署到 ARM 设备。同时借部署契机梳理项目结构，引入成熟的 Django 配置分层与部署资产目录。

**核桃派实测环境**（2026-08-10 SSH 探测）：
- OS：Debian GNU/Linux 12 (bookworm)，aarch64（ARM 64 位），内核 6.1.31
- 资源：4 核 / **内存仅 981MiB**（可用约 700MiB，docker 占用中）/ **Swap 0B（无交换分区，必须创建）** / eMMC 59GB（已用 9%，mmcblk0）
- 运行时：**Python 3.11.2**（/usr/bin/python3，pip 23.0.1）；**无 Node/npm**（不需要——前端在本地构建，Django 托管静态）
- 网络：联网走 **wlan0**（无线 10.83.36.241/24，eth0 DOWN 未插网线）；**Tailscale 已激活**（100.93.171.11，异网可访问）；**IPv6 系统侧已开启（disable_ipv6=0, accept_ra=1）但无公网 IPv6 地址**——仅有 `::1` 回环 + wlan0 `fe80::` 链路本地 + Tailscale `fd7a:...` ULA，路由器/光猫未下发 IPv6 全局前缀（Task 5 阻塞，需在路由器/光猫开启 IPv6）
- 软件：git 2.39.5 已装；**nginx / python3-venv / certbot / ufw 均未安装**（需 apt 安装）；docker 已装且运行（建议禁用释放内存）；systemd `is-system-running` = `starting`（无 failed 单元，可能 docker 拖慢 boot）
- 软件源：apt（清华）、pip 均可用

## What Changes

### 部署架构（生产化 + IPv6 公网 + HTTPS）
```
公网用户 ──DNS: www.xuzixuan.top → AAAA(核桃派公网IPv6)
         ──HTTPS(443)→ Nginx(:80,:443) ── 静态/媒体: /static /media /assets + SPA fallback
                                       └── 反代: /api /admin /markdownx → Gunicorn(127.0.0.1:8000, 2 workers)
                                                                          └─ Django(DEBUG=False) + SQLite + media/
内网用户 ──HTTP(80) → 同一 Nginx（局域网 10.83.36.241 仍可 HTTP 访问）
```

### 项目结构优化（借部署契机引入成熟分层）
- **Django 配置分层**：`server/django/blog_backend/settings/` 拆为 `base.py`（公共）、`dev.py`（DEBUG=True 等）、`prod.py`（DEBUG=False / STATIC_ROOT / 环境变量读取）；`DJANGO_SETTINGS_MODULE` 按环境切换（开发仍默认 dev，生产用 prod）
- **部署资产目录**：新增 `deploy/` 收纳所有部署相关文件（nginx 配置、systemd 单元、部署脚本、`.env.example`），避免散落根目录；仓库自带可复用模板
- **依赖清单**：新增 `server/django/requirements.txt`（锁定 django/drf/markdownx/simplejwt 版本，ARM 有 wheel）
- **遗留清理**：`server/index.js`（旧 Node 浏览量服务，Agent.md 已标弃用）与 `server/README.md` 中的 Node 部署说明移除；`@giscus/react` 依赖（已无引用）从 package.json 移除

### 本地（Windows 开发机）
- 前端 `npm run build` 生成最新 `dist/`（React 同源 `/api`，**前端代码零改动**）
- 将 `server/django/`（代码，不含 `.venv`、`db.sqlite3` 可选）与 `dist/` 传送到核桃派（scp/rsync 或 git）
- 提供 `deploy/deploy.sh` 部署脚本，可重复执行（同步代码 + migrate + collectstatic + 重启服务）

### 核桃派环境准备
- `apt` 安装：`nginx`、`python3-venv`、`certbot`、`python3-certbot-nginx`（其余系统包已有）
- 创建 venv（python3.11）+ `pip install -r requirements.txt`（Django/DRF/markdownx/simplejwt，走清华 pip 镜像；ARM 有 wheel）
- 可停用 docker 服务释放内存（可选，约 300MB）

### IPv6 公网访问与域名（**核心新增**）
- **前提确认**：核桃派已分配**公网 IPv6 地址**（运营商 IPv6，非 fe80 链路本地、非 fd00 ULA）；若未开通，需在路由器/光猫开启 IPv6 并确保 NAT64/防火墙放行
- **DNS 配置**：在域名 `xuzixuan.top` 的 DNS 管理处，为 `www` 子域添加 **AAAA 记录**，指向核桃派公网 IPv6 地址（若 IPv6 会变化，需用 DDNS 动态更新）
- **防火墙**：ufw 放行 IPv6 的 80/443 端口（`ufw allow 80,443` 默认同时作用于 v4/v6）；同时确认路由器/光猫 IPv6 防火墙未拦截入站 80/443
- **DDNS（可选但推荐）**：若运营商分配的 IPv6 前缀会变，部署 DDNS 脚本（如 `ddns-go` 或自写脚本）定期更新 DNS AAAA 记录
- **回退方案**：若 IPv6 不可用或不稳定，仍可经 **Tailscale**（100.93.171.11）异网访问；Tailscale 也支持 MagicDNS + HTTPS

### HTTPS 证书（Let's Encrypt）
- 用 `certbot --nginx -d www.xuzixuan.top` 自动申请并配置证书（**需 DNS 已生效且 80 端口可公网访问**才能通过 HTTP-01 验证）
- certbot 自动修改 Nginx 配置：80 → 301 重定向到 443；443 启用 SSL + 证书路径
- 自动续期：certbot 安装时已注册 systemd timer（`certbot.timer`），无需额外配置
- **HSTS**（可选）：Nginx 443 段添加 `Strict-Transport-Security` 头

### Django 生产化（**BREAKING：仅生产生效，开发模式不变**）
- `DEBUG=False`、`ALLOWED_HOSTS=["www.xuzixuan.top","10.83.36.241","100.93.171.11","localhost"]`
- `SECRET_KEY` 从环境变量读取（不落仓库）
- `CSRF_TRUSTED_ORIGINS=["https://www.xuzixuan.top"]`（HTTPS 域名必须配置，否则登录/POST 报 403）
- `SECURE_SSL_REDIRECT=True`、`SESSION_COOKIE_SECURE=True`、`CSRF_COOKIE_SECURE=True`（生产 HTTPS 配套）
- `STATIC_ROOT` + `collectstatic`（admin/simpleui/markdownx 静态收拢，Nginx 服务）
- `REACT_DIST` 指向部署的 `dist/`
- 数据：迁移现库（拷贝 `db.sqlite3` + `media/`，或在核桃派执行 `import_md` + 重建后台）

### 服务管理
- **Gunicorn**：2 workers（1GB 内存上限），systemd 单元开机自启/崩溃自重启
- **Nginx**：监听 80 + 443（IPv6 + IPv4）；`/static /media /assets` 直接服务，未知路径 `try_files ... /index.html`（SPA fallback），`/api /admin /markdownx` 反代 8000；80 → 443 重定向

### 访问与安全
- **公网访问**：`https://www.xuzixuan.top/`（IPv6 + 域名 + HTTPS，全球可达）
- **内网访问**：`http://10.83.36.241/`（局域网 HTTP）；异网备用 `http://100.93.171.11/`（Tailscale）
- **必须改 `pi` 密码**（当前 pi/pi 极不安全，公网暴露后风险极高）；启用 SSH 密钥登录、禁用密码登录（公网后必做）
- 防火墙（ufw）：仅开放 80/443（公网）+ 22（仅内网/Tailscale，公网 SSH 高危）
- 备份：crontab 定期备份 `db.sqlite3` + `media/`

## Impact
- Affected specs: 新增（部署）；关联 `perf-optimize-arm`（3D/构建优化，已规划）、`fullstack-django-refactor`（全栈架构，已完成）
- Affected code:
  - 后端：`server/django/blog_backend/settings.py` → 拆为 `settings/` 包（base/dev/prod）；新增 `server/django/requirements.txt`；prod 增加 HTTPS 相关安全配置
  - 新增：`deploy/` 目录（nginx.conf 含 IPv6 listen + SSL、gunicorn.service、deploy.sh、.env.example 含 ALLOWED_HOSTS/CSRF_TRUSTED_ORIGINS）
  - 清理：`server/index.js`、`server/README.md`（Node 浏览量服务部分）、`package.json`（移除 `@giscus/react`、`server` 脚本）
  - 前端：零代码改动（仅重新 build）
- 说明：`react_spa` 视图保留（开发兜底），生产由 Nginx 接管静态；开发模式行为完全不变

## ADDED Requirements

### Requirement: 生产站点可通过域名 HTTPS 访问
系统 SHALL 部署后经 `https://www.xuzixuan.top/` 提供完整站点（IPv6 公网 + 域名 + Let's Encrypt 证书）。

#### Scenario: 公网访问前台
- **WHEN** 公网浏览器访问 `https://www.xuzixuan.top/`
- **THEN** 返回 React 前台（SPA、路由、3D/动效正常），证书有效（非自签警告）

#### Scenario: 访问后台
- **WHEN** 访问 `https://www.xuzixuan.top/admin/` 并登录
- **THEN** SimpleUI 中文后台可用，markdownx 实时预览、图片/附件上传到核桃派 `media/` 生效；POST 请求不报 CSRF 403

#### Scenario: HTTP 自动跳转 HTTPS
- **WHEN** 访问 `http://www.xuzixuan.top/`
- **THEN** 301 重定向到 `https://www.xuzixuan.top/`

### Requirement: 内网与备用访问可用
系统 SHALL 同时支持内网 IP 与 Tailscale 访问，作为公网不可用时的回退。

#### Scenario: 内网访问
- **WHEN** 局域网浏览器访问 `http://10.83.36.241/`
- **THEN** 站点正常可用（HTTP，无证书）

#### Scenario: Tailscale 回退
- **WHEN** 异网经 Tailscale 访问 `http://100.93.171.11/`
- **THEN** 站点正常可用（公网 IPv6 故障时的备用通道）

### Requirement: API 与互动功能在生产可用
系统 SHALL 在生产环境完整提供全部 API 与互动功能。

#### Scenario: 生产 API 与互动
- **WHEN** 前台调用 `/api/*`（posts/projects/about/views/comments/like/register/token/me）
- **THEN** 均正常；登录/注册、评论、点赞、附件下载可用

### Requirement: 服务自恢复
系统 SHALL 崩溃或重启后自动恢复服务。

#### Scenario: 服务重启
- **WHEN** 核桃派重启或 Gunicorn/Nginx 进程退出
- **THEN** systemd 自动拉起 Gunicorn 与 Nginx

### Requirement: 证书自动续期
系统 SHALL 在证书到期前自动续期，避免站点因证书过期不可访问。

#### Scenario: 续期
- **WHEN** Let's Encrypt 证书临近到期（< 30 天）
- **THEN** certbot timer 自动续期并 reload nginx

### Requirement: 生产安全基线
系统 SHALL 部署后不暴露开发弱密码、DEBUG 信息与不必要的公网端口。

#### Scenario: 安全检查
- **WHEN** 检查生产配置
- **THEN** `pi` 密码已更改、SSH 禁用密码登录（仅密钥）、`DEBUG=False`、SECRET_KEY 来自环境变量、HTTPS 安全头生效、ufw 仅开放 80/443（公网）+ 22（仅内网）

### Requirement: 数据可备份
系统 SHALL 提供数据库与媒体文件的定期备份机制。

#### Scenario: 备份执行
- **WHEN** 按计划执行备份
- **THEN** `db.sqlite3` 与 `media/` 被复制到备份位置（crontab）

### Requirement: 项目结构成熟分层
系统 SHALL 将 Django 配置按环境分层，并将部署资产集中管理。

#### Scenario: 配置分层
- **WHEN** 开发环境启动
- **THEN** 使用 `settings.dev`（DEBUG=True、REACT_DIST 指向本地 dist、本地 SECRET_KEY）
- **WHEN** 生产环境启动
- **THEN** 使用 `settings.prod`（DEBUG=False、环境变量读取 SECRET_KEY/ALLOWED_HOSTS/CSRF_TRUSTED_ORIGINS、STATIC_ROOT 收拢静态、HTTPS 安全配置）

#### Scenario: 部署资产集中
- **WHEN** 查看仓库部署相关文件
- **THEN** nginx 配置（含 IPv6 + SSL）、systemd 单元、部署脚本、`.env.example` 均位于 `deploy/` 目录，根目录无散落配置

### Requirement: 遗留代码清理
系统 SHALL 移除已弃用的 Node 浏览量服务与无引用依赖。

#### Scenario: 清理验证
- **WHEN** 检查仓库
- **THEN** `server/index.js` 已删除；`package.json` 不含 `@giscus/react` 与 `server` 脚本；`server/README.md` 不含 Node 部署说明

## MODIFIED Requirements
无

## REMOVED Requirements
无
