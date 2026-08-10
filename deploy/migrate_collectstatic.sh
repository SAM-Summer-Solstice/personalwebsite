#!/bin/bash
set -e

DJANGO_DIR="/home/pi/blog/server/django"
cd "$DJANGO_DIR"

echo "========== Task 3.6: 执行 migrate 与 collectstatic =========="
echo "--- 加载 .env 到环境变量 ---"
set -a
. ./.env
set +a
echo "DJANGO_SECRET_KEY 已加载: ${DJANGO_SECRET_KEY:0:10}...（已截断）"
echo "DJANGO_ALLOWED_HOSTS: $DJANGO_ALLOWED_HOSTS"
echo "REACT_DIST 预期路径: /home/pi/blog/dist"
ls -la /home/pi/blog/dist/ | head -5
echo ""

echo "--- 执行 migrate ---"
.venv/bin/python manage.py migrate --settings=blog_backend.settings.prod --no-input 2>&1
echo ""

echo "--- 执行 collectstatic ---"
.venv/bin/python manage.py collectstatic --settings=blog_backend.settings.prod --no-input --clear 2>&1
echo ""

echo "--- collectstatic 输出目录 ---"
ls -la static_collected/ 2>/dev/null | head -20
echo ""
echo "static_collected 总大小: $(du -sh static_collected/ 2>/dev/null | cut -f1)"

echo ""
echo "========== 验证 Django check =========="
.venv/bin/python manage.py check --settings=blog_backend.settings.prod 2>&1

echo ""
echo "========== Task 3.6 完成 =========="
