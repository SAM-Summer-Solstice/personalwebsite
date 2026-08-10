"""
开发环境配置。

用法：DJANGO_SETTINGS_MODULE=blog_backend.settings.dev（manage.py / wsgi.py 默认）
"""

from .base import *  # noqa: F401,F403

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "django-insecure-=9)cl#)ierc^u1z60^tq81%uc=)vgnx9ziuy9=#aj32r$5xh&6"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []

# REACT_DIST 已在 base.py 指向项目根 dist/，开发无需覆盖
