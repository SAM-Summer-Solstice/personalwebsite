#!/bin/bash
# 核桃派从 GitHub 拉取最新代码并更新部署
# 用法：在核桃派上执行 bash /home/pi/blog/deploy/pull_update.sh
#
# 前提：
#   1. 核桃派上的 /home/pi/blog 已通过 git clone 关联到 GitHub 仓库
#   2. 本地已 push 代码到 GitHub
#
# 执行流程：
#   git pull → npm install（如需）→ npm run build → migrate → collectstatic → 重启 gunicorn

set -e

BLOG_DIR=/home/pi/blog
DJANGO_DIR=$BLOG_DIR/server/django
DIST_DIR=$BLOG_DIR/dist

echo "=== 开始从 GitHub 拉取更新 ==="

# 1. 进入项目目录
cd "$BLOG_DIR"
echo ">>> [1/7] 当前目录: $(pwd)"

# 2. 记录更新前的 commit（便于回滚）
OLD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "none")
echo ">>> [2/7] 更新前 commit: $OLD_COMMIT"

# 3. 拉取最新代码
echo ">>> [3/7] 拉取最新代码..."
git pull origin main
NEW_COMMIT=$(git rev-parse --short HEAD)
echo "  更新后 commit: $NEW_COMMIT"

# 如果代码没有变化，跳过后续步骤
if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
    echo "  代码无变化，跳过重新构建。"
    echo "=== 更新完成（无变化）==="
    exit 0
fi

# 4. 安装前端依赖（仅当 package.json 变化时）
if git diff --name-only "$OLD_COMMIT".."$NEW_COMMIT" | grep -q "package.json"; then
    echo ">>> [4/7] package.json 有变化，安装前端依赖..."
    cd "$BLOG_DIR"
    npm install
else
    echo ">>> [4/7] package.json 无变化，跳过 npm install"
fi

# 5. 构建前端
echo ">>> [5/7] 构建前端 (npm run build)..."
cd "$BLOG_DIR"
npm run build
echo "  前端构建完成，产物在 $DIST_DIR"

# 6. Django 数据库迁移 + 收拢静态文件
echo ">>> [6/7] 执行 Django migrate + collectstatic..."
cd "$DJANGO_DIR"
source "$DJANGO_DIR/.venv/bin/activate"
python manage.py migrate --settings=blog_backend.settings.prod
python manage.py collectstatic --noinput --settings=blog_backend.settings.prod

# 7. 重启服务
echo ">>> [7/7] 重启 gunicorn + reload nginx..."
sudo systemctl restart gunicorn
sudo systemctl reload nginx

# 验证服务状态
sleep 2
if systemctl is-active --quiet gunicorn; then
    echo "  gunicorn: active ✅"
else
    echo "  gunicorn: 异常 ❌"
    echo "  查看日志: sudo journalctl -u gunicorn -n 20"
    exit 1
fi

if systemctl is-active --quiet nginx; then
    echo "  nginx: active ✅"
else
    echo "  nginx: 异常 ❌"
    exit 1
fi

echo ""
echo "=== 更新完成 ==="
echo "  commit: $OLD_COMMIT → $NEW_COMMIT"
echo "  如需回滚: cd $BLOG_DIR && git reset --hard $OLD_COMMIT && bash deploy/deploy.sh"
