#!/bin/bash
set -e

DJANGO_DIR="/home/pi/blog/server/django"
cd "$DJANGO_DIR"

set -a
. ./.env
set +a

echo "========== Task 3.7: Django 配置验证（修复版）=========="
echo ""
echo "--- 1. 正确的数据统计（content_ 前缀）---"
.venv/bin/python -c "
import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
for label, sql in [
    ('用户数量', 'SELECT count(*) FROM auth_user'),
    ('文章数量', 'SELECT count(*) FROM content_post'),
    ('项目数量', 'SELECT count(*) FROM content_project'),
    ('关于页', 'SELECT count(*) FROM content_about'),
    ('评论数量', 'SELECT count(*) FROM content_comment'),
    ('附件数量', 'SELECT count(*) FROM content_attachment'),
]:
    try:
        cur.execute(sql)
        print(f'  {label}: {cur.fetchone()[0]}')
    except Exception as e:
        print(f'  {label}: 查询失败 ({e})')
conn.close()
"
echo ""
echo "--- 2. runserver 实际请求测试（用 Host: localhost 绕过 ALLOWED_HOSTS）---"
.venv/bin/python manage.py runserver 127.0.0.1:8001 --settings=blog_backend.settings.prod &
SERVER_PID=$!
sleep 3
echo "  服务器 PID: $SERVER_PID"
echo ""
echo "  测试首页 (前端 SPA，期望 200):"
curl -s -H "Host: localhost" -o /dev/null -w "    HTTP 状态: %{http_code}, 大小: %{size_download} bytes\n" http://127.0.0.1:8001/
echo "  测试 /api/ (Django API):"
curl -s -H "Host: localhost" -o /dev/null -w "    HTTP 状态: %{http_code}, 大小: %{size_download} bytes\n" http://127.0.0.1:8001/api/
echo "  测试 /admin/ (管理后台，期望 302 重定向到登录):"
curl -s -H "Host: localhost" -o /dev/null -w "    HTTP 状态: %{http_code}, 大小: %{size_download} bytes\n" http://127.0.0.1:8001/admin/
echo "  测试 /static/admin/css/base.css (静态文件):"
curl -s -H "Host: localhost" -o /dev/null -w "    HTTP 状态: %{http_code}, 大小: %{size_download} bytes\n" http://127.0.0.1:8001/static/admin/css/base.css
echo ""
echo "  首页实际内容前 200 字符:"
curl -s -H "Host: localhost" http://127.0.0.1:8001/ | head -c 200
echo ""
echo ""
echo "  /api/ 实际内容:"
curl -s -H "Host: localhost" http://127.0.0.1:8001/api/ | head -c 500
echo ""
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
echo ""
echo "========== Task 3.7 验证完成 =========="
