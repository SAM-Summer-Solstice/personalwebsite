#!/bin/bash
set -e

DJANGO_DIR="/home/pi/blog/server/django"
ENV_FILE="$DJANGO_DIR/.env"
PY="$DJANGO_DIR/.venv/bin/python"

echo "=== 1. 重新生成 .env（含 DJANGO_SETTINGS_MODULE）==="

# 过滤含 $ 或 # 的密钥：写入 .env 后需被 bash source 解析，$ 会触发变量展开
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
echo "  .env 已生成（权限 600）"

echo "=== 2. 更新 gunicorn.service（去掉 --settings）==="

cat > /tmp/gunicorn.service <<'SVC_EOF'
# systemd 服务单元 —— Gunicorn for Blog (Django WSGI)
# 部署位置：/etc/systemd/system/gunicorn.service

[Unit]
Description=Gunicorn for Blog
After=network.target

[Service]
User=pi
Group=pi
WorkingDirectory=/home/pi/blog/server/django
EnvironmentFile=/home/pi/blog/server/django/.env
Environment=DJANGO_SETTINGS_MODULE=blog_backend.settings.prod
ExecStart=/home/pi/blog/server/django/.venv/bin/gunicorn \
    --workers 2 \
    --bind 127.0.0.1:8000 \
    blog_backend.wsgi:application
Restart=on-failure
RestartSec=5s

# 内存限制：核桃派 1GB 总内存，预留 100MB 给系统/其他进程
MemoryMax=900M

[Install]
WantedBy=multi-user.target
SVC_EOF

sudo cp /tmp/gunicorn.service /etc/systemd/system/gunicorn.service
sudo systemctl daemon-reload
echo "  gunicorn.service 已更新"

echo "=== 3. 重启 gunicorn 并等待稳定 ==="

sudo systemctl restart gunicorn
sleep 5

echo "=== 4. 验证 gunicorn 状态 ==="

STATUS=$(sudo systemctl is-active gunicorn)
echo "  状态: $STATUS"

if [ "$STATUS" != "active" ]; then
    echo "  [警告] gunicorn 未处于 active 状态，查看最近日志："
    sudo journalctl -u gunicorn -n 15 --no-pager
    exit 1
fi

sudo systemctl status gunicorn --no-pager -l | head -n 15

echo "=== 5. 验证 HTTP（通过 gunicorn 直接访问）==="

RESP=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: localhost" -H "X-Forwarded-Proto: https" http://127.0.0.1:8000/)
echo "  首页 HTTP 状态: $RESP"

RESP_ADMIN=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: localhost" -H "X-Forwarded-Proto: https" http://127.0.0.1:8000/admin/)
echo "  /admin/ HTTP 状态: $RESP_ADMIN"

echo "=== fix_gunicorn.sh 完成 ==="
