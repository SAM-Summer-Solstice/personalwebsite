#!/bin/bash
set -e

echo "=== 4.3 配置 nginx ==="

echo "--- 4.3.1 在主配置 nginx.conf 启用完整 gzip ---"
sudo sed -i 's/^# gzip_vary on;/gzip_vary on;/' /etc/nginx/nginx.conf
sudo sed -i 's/^# gzip_proxied any;/gzip_proxied any;/' /etc/nginx/nginx.conf
sudo sed -i 's/^# gzip_comp_level 6;/gzip_comp_level 6;/' /etc/nginx/nginx.conf
sudo sed -i 's/^# gzip_types .*/gzip_types text\/plain text\/css text\/xml application\/json application\/javascript application\/xml+rss application\/xml image\/svg+xml;/' /etc/nginx/nginx.conf
echo "  主配置 gzip 已启用"

echo "--- 4.3.2 上传 nginx 站点配置（不含 gzip）---"
cat > /tmp/blog_nginx.conf <<'NGINX_EOF'
# Nginx 站点配置 —— Django + React 博客
# gzip 配置在 /etc/nginx/nginx.conf 的 http 块里统一管理

server {
    # 同时监听 IPv4 和 IPv6 的 80 端口
    listen 80;
    listen [::]:80;

    server_name www.xuzixuan.top 10.83.36.241 100.93.171.11 localhost;

    # 客户端上传大文件支持（与 markdownx 上传限制一致）
    client_max_body_size 150M;

    # Django 静态文件（collectstatic 收拢目录）
    location /static/ {
        alias /home/pi/blog/server/django/static_collected/;
    }

    # Django 媒体文件（用户上传）
    location /media/ {
        alias /home/pi/blog/server/django/media/;
    }

    # 前端 SPA（React + Vite 构建产物）
    location / {
        root /home/pi/blog/dist;
        try_files $uri $uri/ /index.html;
    }

    # 反代到 Gunicorn：API 接口
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 反代到 Gunicorn：Django 后台
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 反代到 Gunicorn：markdownx 上传接口
    location /markdownx/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

sudo cp /tmp/blog_nginx.conf /etc/nginx/sites-available/blog
echo "  站点配置已写入 /etc/nginx/sites-available/blog"

echo "--- 4.3.3 启用站点，移除默认站点 ---"
sudo ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
sudo rm -f /etc/nginx/sites-enabled/default
echo "  已软链到 sites-enabled，已移除 default"

echo "--- 4.3.4 测试 nginx 配置语法 ---"
sudo nginx -t

echo "--- 4.3.5 重载 nginx ---"
sudo systemctl reload nginx
sudo systemctl enable nginx
echo "  nginx 已重载并设为开机自启"

echo "--- 4.3.6 检查 nginx 状态 ---"
sudo systemctl is-active nginx
sudo systemctl status nginx --no-pager -l | head -n 8

echo ""
echo "=== 4.4 配置 ufw 防火墙 ==="

echo "--- 4.4.1 重置 ufw ---"
sudo ufw --force reset

echo "--- 4.4.2 设置默认策略 ---"
sudo ufw default deny incoming
sudo ufw default allow outgoing

echo "--- 4.4.3 放行必要端口 ---"
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

echo "--- 4.4.4 启用 ufw ---"
sudo ufw --force enable

echo "--- 4.4.5 查看 ufw 状态 ---"
sudo ufw status verbose

echo ""
echo "=== 4.5 验证 HTTP 访问（通过 nginx）==="

echo "--- 4.5.1 本机 localhost 访问 ---"
RESP_HOME=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
echo "  首页 (localhost): $RESP_HOME"

RESP_ADMIN=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin/)
echo "  /admin/ (localhost): $RESP_ADMIN"

RESP_API=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/)
echo "  /api/ (localhost): $RESP_API"

echo "--- 4.5.2 通过局域网 IP 访问 ---"
RESP_LAN=$(curl -s -o /dev/null -w "%{http_code}" http://10.83.36.241/)
echo "  首页 (10.83.36.241): $RESP_LAN"

echo "--- 4.5.3 验证首页内容包含正确标题 ---"
TITLE=$(curl -s http://localhost/ | grep -o '<title>[^<]*</title>' | head -n 1)
echo "  首页标题: $TITLE"

echo ""
echo "=== setup_nginx_ufw.sh 完成 ==="
echo "Task 4 生产配置与启动（HTTP）全部完成"
