#!/bin/bash
set -e

ENV_FILE="/home/pi/blog/server/django/.env"
PY="/home/pi/blog/server/django/.venv/bin/python"

echo "=== 生成 Django SECRET_KEY（原始密钥 + 双引号）==="

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

echo "=== .env 已生成（权限 600）==="

echo "--- 验证 bash source 可解析 ---"
set -a
. "$ENV_FILE"
set +a
echo "  SECRET_KEY 长度: ${#DJANGO_SECRET_KEY}"
echo "  ALLOWED_HOSTS: $DJANGO_ALLOWED_HOSTS"

echo "--- 验证 systemd 可解析 ---"
sudo systemd-analyze verify /etc/systemd/system/gunicorn.service 2>/dev/null || echo "  (gunicorn.service 尚未安装，跳过 systemd 校验)"

echo "=== setup_env.sh 完成 ==="
