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
# 局域网 HTTP 阶段默认关闭（否则 http://10.83.36.241 的 API 会被 301 到不存在的 HTTPS）；
# 公网 HTTPS 就绪后，在 .env 设置以下两行即可重新开启，无需改代码：
#   DJANGO_SECURE_SSL_REDIRECT=true
#   DJANGO_SECURE_COOKIES=true
def _env_flag(name: str) -> bool:
    return os.environ.get(name, "false").lower() in ("1", "true", "yes", "on")


SECURE_SSL_REDIRECT = _env_flag("DJANGO_SECURE_SSL_REDIRECT")
SESSION_COOKIE_SECURE = _env_flag("DJANGO_SECURE_COOKIES")
CSRF_COOKIE_SECURE = _env_flag("DJANGO_SECURE_COOKIES")
SECURE_HSTS_SECONDS = 31536000  # 1 年（仅随 HTTPS 响应下发，HTTP 阶段无副作用）
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# 邮件（SMTP）配置：生产必须在 .env 填写，例如 163 邮箱 smtp.163.com:465 SSL。
# EMAIL_HOST_USER 为发件邮箱，EMAIL_HOST_PASSWORD 为邮箱 SMTP 授权码；
# 缺失时配置留空，send_mail 已 fail_silently 兜底（发不出邮件但不影响业务）。
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "465"))
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "true").lower() in ("1", "true", "yes", "on")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get("EMAIL_HOST_USER") or "noreply@xuzixuan.top"
