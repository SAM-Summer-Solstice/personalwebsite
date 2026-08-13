#!/bin/bash
set -e

DJANGO_DIR="/home/pi/blog/server/django"
ENV_FILE="$DJANGO_DIR/.env"
PY="$DJANGO_DIR/.venv/bin/python"

echo "================================================"
echo "  Task 4: 生产配置与启动（HTTP）"
echo "================================================"
echo ""

echo "=== 4.1 重新生成安全的 .env（不含 # $，用双引号）==="
MAX_ATTEMPTS=10
ATTEMPT=0
KEY=""
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    KEY=$("$PY" -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
    if echo "$KEY" | grep -q '[#$]'; then
        echo "  尝试 $ATTEMPT: 密钥含 # 或 $，重新生成..."
        KEY=""
        continue
    else
        echo "  尝试 $ATTEMPT: 密钥符合要求（长度 ${#KEY}）"
        break
    fi
done
if [ -z "$KEY" ]; then
    echo "ERROR: 无法生成不含 # $ 的密钥"
    exit 1
fi
cat > "$ENV_FILE" <<ENV_EOF
DJANGO_SECRET_KEY="${KEY}"
DJANGO_SETTINGS_MODULE=blog_backend.settings.prod
DJANGO_ALLOWED_HOSTS=www.xuzixuan.top,10.83.36.241,100.93.171.11,localhost
DJANGO_CSRF_TRUSTED_ORIGINS=https://www.xuzixuan.top,http://10.83.36.241,http://100.93.171.11,http://localhost
ENV_EOF
chmod 600 "$ENV_FILE"
echo "  .env 已生成，权限 $(stat -c '%a' "$ENV_FILE")"
echo ""

echo "=== 4.2 安装 gunicorn systemd service ==="
sudo cp /home/pi/blog/deploy/gunicorn.service /etc/systemd/system/gunicorn.service
sudo systemctl daemon-reload
sudo systemctl enable gunicorn
sudo systemctl restart gunicorn
sleep 2
echo "  gunicorn 状态:"
sudo systemctl is-active gunicorn
sudo systemctl is-enabled gunicorn
echo ""

echo "=== 4.3 配置 nginx ==="
sudo cp /home/pi/blog/deploy/nginx.conf /etc/nginx/sites-available/blog
sudo ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
sudo rm -f /etc/nginx/sites-enabled/default
echo "  nginx 配置测试:"
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx
echo "  nginx 状态:"
sudo systemctl is-active nginx
sudo systemctl is-enabled nginx
echo ""

echo "=== 4.4 配置 ufw 防火墙 ==="
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable
sudo ufw status verbose
echo ""

echo "=== 4.5 验证 HTTP 访问 ==="
echo "--- 通过 nginx 访问（端口 80）---"
echo "  首页 (http://localhost):"
curl -s -o /dev/null -w "    HTTP 状态: %{http_code}, 大小: %{size_download} bytes\n" http://localhost/
echo "  /admin/:"
curl -s -o /dev/null -w "    HTTP 状态: %{http_code}\n" http://localhost/admin/
echo "  /static/admin/css/base.css:"
curl -s -o /dev/null -w "    HTTP 状态: %{http_code}\n" http://localhost/static/admin/css/base.css
echo "  /api/posts/ (API 端点):"
curl -s -o /dev/null -w "    HTTP 状态: %{http_code}\n" http://localhost/api/posts/
echo ""

echo "--- 通过局域网 IP 访问 ---"
echo "  首页 (http://10.83.36.241):"
curl -s -o /dev/null -w "    HTTP 状态: %{http_code}, 大小: %{size_download} bytes\n" http://10.83.36.241/
echo ""

echo "=== 4.6 服务状态汇总 ==="
echo "  gunicorn: $(sudo systemctl is-active gunicorn) / $(sudo systemctl is-enabled gunicorn)"
echo "  nginx:    $(sudo systemctl is-active nginx) / $(sudo systemctl is-enabled nginx)"
echo "  ufw:      $(sudo ufw status | head -1)"
echo ""
echo "================================================"
echo "  Task 4 完成！"
echo "  现在可以通过 http://10.83.36.241 访问博客"
echo "================================================"
