#!/bin/bash
set -e

DJANGO_DIR="/home/pi/blog/server/django"
cd "$DJANGO_DIR"

set -a
. ./.env
set +a

echo "========== Task 3.7 补充验证：gunicorn + 重定向头检查 =========="
echo ""
echo "--- 1. 用 gunicorn 启动（生产方式，后台运行）---"
.venv/bin/gunicorn blog_backend.wsgi:application \
  --bind 127.0.0.1:8000 \
  --workers 2 \
  --env DJANGO_SETTINGS_MODULE=blog_backend.settings.prod \
  --pid /tmp/gunicorn_test.pid \
  --daemon
sleep 2
echo "gunicorn PID: $(cat /tmp/gunicorn_test.pid 2>/dev/null || echo '未启动')"
echo ""
echo "--- 2. 检查 301 重定向的 Location 头（验证 SSL 重定向行为）---"
echo "  首页请求 (HTTP) → 期望 301 + Location: https://..."
curl -s -o /dev/null -D - -H "Host: localhost" http://127.0.0.1:8000/ | grep -E "HTTP/|Location:"
echo ""
echo "--- 3. 模拟 nginx 转发：带 X-Forwarded-Proto: https ---"
echo "  首页请求 (模拟 HTTPS) → 期望 200 + HTML 内容"
HTTP_CODE=$(curl -s -o /tmp/response_home.html -w "%{http_code}" \
  -H "Host: localhost" \
  -H "X-Forwarded-Proto: https" \
  http://127.0.0.1:8000/)
echo "  HTTP 状态: $HTTP_CODE"
echo "  响应大小: $(wc -c < /tmp/response_home.html) bytes"
echo "  内容前 300 字符:"
head -c 300 /tmp/response_home.html
echo ""
echo ""

echo "--- 4. /api/ (模拟 HTTPS) ---"
HTTP_CODE=$(curl -s -o /tmp/response_api.txt -w "%{http_code}" \
  -H "Host: localhost" \
  -H "X-Forwarded-Proto: https" \
  http://127.0.0.1:8000/api/)
echo "  HTTP 状态: $HTTP_CODE"
echo "  响应内容:"
cat /tmp/response_api.txt | head -c 500
echo ""
echo ""

echo "--- 5. /admin/ (模拟 HTTPS，期望 302 到登录页) ---"
curl -s -o /dev/null -D - \
  -H "Host: localhost" \
  -H "X-Forwarded-Proto: https" \
  http://127.0.0.1:8000/admin/ | grep -E "HTTP/|Location:"
echo ""

echo "--- 6. 静态文件 (Django serve，模拟 HTTPS) ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Host: localhost" \
  -H "X-Forwarded-Proto: https" \
  http://127.0.0.1:8000/static/admin/css/base.css)
echo "  /static/admin/css/base.css → HTTP $HTTP_CODE"
echo ""

echo "--- 7. 关闭 gunicorn ---"
kill $(cat /tmp/gunicorn_test.pid) 2>/dev/null || true
sleep 1
echo "gunicorn 已关闭"
echo ""
echo "========== 验证完成 =========="
