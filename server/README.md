# 后端服务（server/django/）

基于 Django 5.2 + DRF + django-markdownx 的博客后端，提供内容管理 API 与 SimpleUI 中文后台。

## 本地开发

```bash
cd server/django
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver      # 默认 http://127.0.0.1:8000
```

开发时 `npm run dev` 启动 Vite，`/api/*` 与 `/admin/*` 通过 Vite 代理转发到 Django dev server，前后端同源联调。

## 配置

Django 配置已按环境分层（`blog_backend/settings/`）：

| 模块 | 用途 |
| --- | --- |
| `base.py` | 公共配置（INSTALLED_APPS / MIDDLEWARE / DATABASES 等） |
| `dev.py` | 开发：`DEBUG=True`、本地 SECRET_KEY，`manage.py` / `wsgi.py` 默认 |
| `prod.py` | 生产：`DEBUG=False`、SECRET_KEY/ALLOWED_HOSTS/CSRF_TRUSTED_ORIGINS 走环境变量、`STATIC_ROOT`、HTTPS 安全配置 |

切换环境：`python manage.py check --settings=blog_backend.settings.prod`

## 生产部署

详见仓库根目录 `deploy/`（Nginx + Gunicorn + systemd 部署模板）与 `.trae/specs/deploy-walnutpi/`。

后台访问 `/admin/`（SimpleUI），markdownx 编辑器支持图片/视频上传，文件落盘到 `media/`。
