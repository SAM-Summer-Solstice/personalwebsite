"""
生产环境配置。

用法：DJANGO_SETTINGS_MODULE=blog_backend.settings.prod
敏感配置从环境变量 / .env 读取（python-dotenv 可选，systemd 可直接注入 EnvironmentFile）。
"""

import os

from .base import *  # noqa: F401,F403

# 敏感配置从环境变量读取
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("生产环境必须设置 DJANGO_SECRET_KEY 环境变量（见 deploy/.env.example）")

DEBUG = False

ALLOWED_HOSTS = os.environ.get(
    "DJANGO_ALLOWED_HOSTS",
    "www.xuzixuan.top,10.83.36.241,100.93.171.11,localhost",
).split(",")

CSRF_TRUSTED_ORIGINS = os.environ.get(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "https://www.xuzixuan.top",
).split(",")

# 静态文件收拢（collectstatic 输出到此目录，由 Nginx 直接服务）
STATIC_ROOT = BASE_DIR / "static_collected"

# 前端构建产物部署路径（核桃派部署目录下的 dist/）
REACT_DIST = BASE_DIR.parent.parent / "dist"

# HTTPS 安全配置（生产配套）
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 年
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
