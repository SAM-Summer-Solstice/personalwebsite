# Tasks

- [ ] Task 1: 本地构建与打包
  - [ ] SubTask 1.1: 本地 `npm run build` 生成最新 `dist/`
  - [ ] SubTask 1.2: 生成后端依赖清单 `server/django/requirements.txt`（django/djangorestframework/django-markdownx/djangorestframework-simplejwt + 版本）
  - [ ] SubTask 1.3: 定义部署结构（`server/django/` 代码 + `dist/` + 可选的 `db.sqlite3`/`media/`），准备传输（scp/rsync/git）
- [ ] Task 2: 核桃派环境准备
  - [ ] SubTask 2.1: `apt install nginx python3-venv`；确认 python3.11 + pip
  - [ ] SubTask 2.2: 创建 venv（python3.11）并 `pip install -r requirements.txt`（清华镜像），验证 `python manage.py check` 通过
  - [ ] SubTask 2.3: （可选）`systemctl disable --now docker` 释放内存
- [ ] Task 3: 代码与数据部署
  - [ ] SubTask 3.1: 传输代码到核桃派（如 `/home/pi/blog/`）
  - [ ] SubTask 3.2: `migrate`、`collectstatic`（收拢 admin/simpleui/markdownx 静态）
  - [ ] SubTask 3.3: 数据落地：拷贝 `db.sqlite3` + `media/`，或 `import_md` + 重建超管/测试账号
- [ ] Task 4: 生产配置与启动
  - [ ] SubTask 4.1: `settings.py` 生产化：DEBUG 由环境变量控制、`ALLOWED_HOSTS`、`SECRET_KEY` env、`STATIC_ROOT`、`CSRF_TRUSTED_ORIGINS`
  - [ ] SubTask 4.2: Gunicorn（2 workers）systemd 单元（开机自启/崩溃自重启）
  - [ ] SubTask 4.3: Nginx 配置：80 端口、`/static /media /assets` 静态、SPA `try_files` fallback、`/api /admin /markdownx` 反代 8000；`nginx -t` 通过
- [ ] Task 5: 验证与安全
  - [ ] SubTask 5.1: 浏览器回归：80 端口前台/后台/API/评论/点赞/登录注册/附件上传下载全流程
  - [ ] SubTask 5.2: systemd 重启测试：重启核桃派后服务自恢复
  - [ ] SubTask 5.3: 安全基线：更改 `pi` 密码（或在部署时生成新密码并交付用户）、ufw 防火墙（80/22）、确认 `DEBUG=False` 且无 DEBUG 信息泄露
  - [ ] SubTask 5.4: 备份：crontab 定期备份 `db.sqlite3` + `media/`

# Task Dependencies
- [Task 2] 依赖 [Task 1]（依赖清单与产物）
- [Task 3] 依赖 [Task 2]
- [Task 4] 依赖 [Task 3]
- [Task 5] 依赖 [Task 4]
