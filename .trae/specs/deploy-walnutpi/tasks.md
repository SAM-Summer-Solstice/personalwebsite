# Tasks

- [x] Task 1: 项目结构优化与遗留清理（本地，无依赖）
  - [x] SubTask 1.1: Django 配置分层——将 `server/django/blog_backend/settings.py` 拆为 `settings/` 包：`base.py`（公共配置）、`dev.py`（DEBUG=True / 本地 SECRET_KEY / REACT_DIST 指向项目 dist）、`prod.py`（DEBUG=False / 环境变量读取 SECRET_KEY/ALLOWED_HOSTS/CSRF_TRUSTED_ORIGINS / STATIC_ROOT / HTTPS 安全配置 SECURE_SSL_REDIRECT/SESSION_COOKIE_SECURE/CSRF_COOKIE_SECURE）；`manage.py` 与 `wsgi.py` 默认 `DJANGO_SETTINGS_MODULE=blog_backend.settings.dev`
  - [x] SubTask 1.2: 新增 `server/django/requirements.txt`（django==5.2.4、djangorestframework、django-markdownx、djangorestframework-simplejwt、gunicorn、django-simpleui；锁定版本）
  - [x] SubTask 1.3: 遗留清理——删除 `server/index.js`；从 `package.json` 移除 `@giscus/react` 依赖与 `server` 脚本；更新 `server/README.md`（移除 Node 浏览量服务与 Giscus 配置部分，改为 Django 后端说明）
  - [x] SubTask 1.4: 新增 `deploy/` 目录，包含：`nginx.conf`（80+443 监听 IPv6+IPv4、静态/媒体/SPA fallback、反代 /api /admin /markdownx、80→443 重定向占位）、`gunicorn.service`（systemd 单元，2 workers）、`deploy.sh`（同步代码 + migrate + collectstatic + 重启服务）、`.env.example`（SECRET_KEY / ALLOWED_HOSTS / CSRF_TRUSTED_ORIGINS 模板，含 www.xuzixuan.top）
  - [x] SubTask 1.5: 本地 `npm run build` 生成最新 `dist/`；验证 `manage.py check`（dev settings）通过
- [ ] Task 2: 核桃派环境准备
  - [ ] SubTask 2.1: SSH 连接核桃派（10.83.36.241，pi/pi）；`apt update && apt install -y nginx python3-venv certbot python3-certbot-nginx`；确认 python3.11 + pip
  - [ ] SubTask 2.2: 创建部署目录（如 `/home/pi/blog/`）与 venv（python3.11）；`pip install -r requirements.txt`（清华镜像 `-i https://pypi.tuna.tsinghua.edu.cn/simple`）；验证 `python manage.py check --settings=blog_backend.settings.prod` 通过
  - [ ] SubTask 2.3: 确认核桃派公网 IPv6：`ip -6 addr` 查看是否有非 fe80::/10、非 fd00::/8 的全局地址；若无可公网访问的 IPv6，需在路由器/光猫开启 IPv6 并放行入站 80/443
  - [ ] SubTask 2.4: （可选）`systemctl disable --now docker` 释放内存
- [ ] Task 3: 代码与数据部署
  - [ ] SubTask 3.1: 传输代码到核桃派（`server/django/` + `dist/`，不含 `.venv`；scp/rsync/git 任选）
  - [ ] SubTask 3.2: 在核桃派执行 `migrate`（prod settings）与 `collectstatic --noinput`（收拢 admin/simpleui/markdownx 静态到 STATIC_ROOT）
  - [ ] SubTask 3.3: 数据落地：拷贝 `db.sqlite3` + `media/` 到核桃派；或 `import_md` + `createsuperuser` 重建超管
- [ ] Task 4: 生产配置与启动（先 HTTP，验证后再上 HTTPS）
  - [ ] SubTask 4.1: 在核桃派创建 `.env`（基于 `deploy/.env.example`，填入生产 SECRET_KEY、ALLOWED_HOSTS=["www.xuzixuan.top","10.83.36.241","100.93.171.11","localhost"]、CSRF_TRUSTED_ORIGINS=["https://www.xuzixuan.top"]）；确认 `prod.py` 读取环境变量
  - [ ] SubTask 4.2: 安装 Gunicorn systemd 单元（`deploy/gunicorn.service`，指定 prod settings、2 workers、bind 127.0.0.1:8000）；`systemctl enable --now gunicorn`；开机自启 + 崩溃重启
  - [ ] SubTask 4.3: 安装 Nginx 配置（`deploy/nginx.conf` → `/etc/nginx/sites-available/`，软链 `sites-enabled/`）；先只启用 80 端口（HTTP），`nginx -t` 通过后 `systemctl reload nginx`；局域网 `http://10.83.36.241/` 验证可用
- [ ] Task 5: IPv6 公网 + 域名 + HTTPS
  - [ ] SubTask 5.1: DNS 配置：在域名 `xuzixuan.top` 的 DNS 管理处，为 `www` 添加 **AAAA 记录**指向核桃派公网 IPv6（若 IPv6 前缀会变，部署 DDNS 如 ddns-go 定期更新）
  - [ ] SubTask 5.2: 防火墙放行：`ufw allow 80,443`（同时作用于 v4/v6）；确认路由器/光猫 IPv6 防火墙未拦截入站 80/443；从外网 ping6 / curl -6 验证可达
  - [ ] SubTask 5.3: 申请证书：`certbot --nginx -d www.xuzixuan.top`（HTTP-01 验证，需 DNS 已生效且 80 可公网访问）；certbot 自动配置 443 SSL + 80→443 重定向；`nginx -t` 后 reload
  - [ ] SubTask 5.4: 验证 HTTPS：外网访问 `https://www.xuzixuan.top/`（证书有效、前台/后台/API 全流程）；确认 `http://` 自动 301 到 `https://`；确认 certbot timer 已启用（`systemctl status certbot.timer`）
- [ ] Task 6: 验证与安全
  - [ ] SubTask 6.1: 浏览器回归：公网 `https://www.xuzixuan.top/` 前台（首页/列表/单篇/项目/关于，3D 星图/吊牌/GSAP 动效/终端）/ 后台（admin 登录、markdownx 预览、图片上传）/ API（posts/projects/about/views/comments/like/register/token/me）/ 登录注册 / 评论 / 点赞 / 附件上传下载全流程；同时验证内网 HTTP 与 Tailscale 回退
  - [ ] SubTask 6.2: systemd 重启测试：`reboot` 核桃派后确认 Nginx + Gunicorn 自动恢复
  - [ ] SubTask 6.3: 安全基线：更改 `pi` 密码（`passwd`）；SSH 禁用密码登录、仅密钥（编辑 sshd_config `PasswordAuthentication no`）；ufw 仅开放 80/443（公网）+ 22（仅内网/Tailscale）；确认 `DEBUG=False` 且访问不存在路径返回 404 而非 Django 调试页
  - [ ] SubTask 6.4: 备份：crontab 定期备份 `db.sqlite3` + `media/`（如每日 03:00 tar 到 `/home/pi/backup/`）

# Task Dependencies
- [Task 2] 依赖 [Task 1]（依赖清单与部署资产）
- [Task 3] 依赖 [Task 2]
- [Task 4] 依赖 [Task 3]
- [Task 5] 依赖 [Task 4]（需 HTTP 先可用，且 DNS 生效）
- [Task 6] 依赖 [Task 5]
