#!/bin/bash
# 博客部署脚本（在核桃派上重复执行）
# 用法：
#   1. 把项目代码同步到 /home/pi/blog/（dist/ 和 server/django/ 都在其中）
#   2. 确认 server/django/.env 已填写（参考 deploy/.env.example）
#   3. 确认 server/django/.venv 已创建（python -m venv .venv）
#   4. 在核桃派上执行：bash deploy/deploy.sh
# 作用：迁移数据库、收拢静态文件、重启 Gunicorn、reload Nginx

set -e

# 路径变量
BLOG_DIR=/home/pi/blog
DJANGO_DIR=$BLOG_DIR/server/django

# 1. 进入 Django 目录
cd $DJANGO_DIR

# 2. 激活虚拟环境
source $DJANGO_DIR/.venv/bin/activate

# 加载 .env 环境变量（prod 设置需要 DJANGO_SECRET_KEY 等）
if [ -f "$DJANGO_DIR/.env" ]; then
    set -a
    source "$DJANGO_DIR/.env"
    set +a
fi

# 3. 安装依赖（首次部署或 requirements 变更时需要，日常可注释掉以加速）
# pip install -r requirements.txt

# 4. 执行数据库迁移
python manage.py migrate --settings=blog_backend.settings.prod

# 5. 收拢静态文件到 static_collected/
python manage.py collectstatic --noinput --settings=blog_backend.settings.prod

# 6. 重启 Gunicorn（让新代码生效）
sudo systemctl restart gunicorn

# 7. reload Nginx（让站点配置生效，无中断）
sudo systemctl reload nginx

echo "部署完成。"
