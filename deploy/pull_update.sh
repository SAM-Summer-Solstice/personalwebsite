#!/bin/bash
# 核桃派从 GitHub 拉取最新代码并更新部署
# 用法：在核桃派上执行 bash /home/pi/blog/deploy/pull_update.sh
#
# 前提：
#   1. 核桃派上的 /home/pi/blog 已通过 git clone 关联到 GitHub 仓库
#   2. 本地已 push 代码到 GitHub
#
# 执行流程：
#   git pull → 前端构建（如有 Node.js）→ migrate → collectstatic → 重启 gunicorn
#
# 注意：WalnutPi 上通常没有 Node.js，前端 dist/ 需要在本地构建后通过
#       deploy/transfer_dist.sh 传输。本脚本会在没有 Node.js 时自动跳过前端构建。

set -e

BLOG_DIR=/home/pi/blog
DJANGO_DIR=$BLOG_DIR/server/django
DIST_DIR=$BLOG_DIR/dist

echo "=== 开始从 GitHub 拉取更新 ==="

# 1. 进入项目目录
cd "$BLOG_DIR"
echo ">>> [1/8] 当前目录: $(pwd)"

# 2. 记录更新前的 commit（便于回滚）
OLD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "none")
echo ">>> [2/8] 更新前 commit: $OLD_COMMIT"

# 2.5 备份生产数据（防止 git pull 删除被 .gitignore 排除但仍被本地跟踪的文件）
BACKUP_TMP="/tmp/blog_data_backup_$(date +%s)"
DATA_PATHS="server/django/db.sqlite3 server/django/db.sqlite3-journal server/django/media content/posts content/projects"
NEED_BACKUP=false

echo ">>> [2.5/8] 检查生产数据是否被 Git 跟踪..."
for path in $DATA_PATHS; do
    if git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
        echo "  ⚠️ $path 仍被 Git 跟踪，pull 时可能被删除"
        NEED_BACKUP=true
    fi
done

if [ "$NEED_BACKUP" = true ]; then
    echo "  创建临时备份: $BACKUP_TMP"
    mkdir -p "$BACKUP_TMP"
    for path in $DATA_PATHS; do
        if [ -e "$path" ]; then
            mkdir -p "$BACKUP_TMP/$(dirname "$path")"
            cp -a "$path" "$BACKUP_TMP/$path" 2>/dev/null || true
            echo "  已备份: $path"
        fi
    done
else
    echo "  生产数据未被 Git 跟踪，无需备份保护。"
fi

# 3. 拉取最新代码
echo ">>> [3/8] 拉取最新代码..."
git pull origin main
NEW_COMMIT=$(git rev-parse --short HEAD)
echo "  更新后 commit: $NEW_COMMIT"

# 3.5 恢复生产数据（如果 pull 时被删除了）
if [ "$NEED_BACKUP" = true ] && [ -d "$BACKUP_TMP" ]; then
    echo ">>> [3.5/8] 恢复生产数据..."
    for path in $DATA_PATHS; do
        if [ -e "$BACKUP_TMP/$path" ] && [ ! -e "$BLOG_DIR/$path" ]; then
            mkdir -p "$BLOG_DIR/$(dirname "$path")"
            cp -a "$BACKUP_TMP/$path" "$BLOG_DIR/$path"
            echo "  已恢复: $path"
        elif [ -e "$BACKUP_TMP/$path" ]; then
            echo "  仍存在，跳过: $path"
        fi
    done
    # 从 Git 索引移除这些文件（与 .gitignore 保持一致）
    echo "  从 Git 索引移除生产数据..."
    git rm -r --cached --ignore-unmatch server/django/db.sqlite3 server/django/db.sqlite3-journal server/django/media content/posts content/projects >/dev/null 2>&1 || true
    rm -rf "$BACKUP_TMP"
    echo "  临时备份已清理"
fi

# 如果代码没有变化，跳过后续步骤
if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
    echo "  代码无变化，跳过重新构建。"
    echo "=== 更新完成（无变化）==="
    exit 0
fi

# 4. 前端依赖安装 + 构建（仅当有 Node.js 时）
if command -v npm &>/dev/null; then
    if git diff --name-only "$OLD_COMMIT".."$NEW_COMMIT" | grep -q "package.json"; then
        echo ">>> [4/8] package.json 有变化，安装前端依赖..."
        cd "$BLOG_DIR"
        npm install
    else
        echo ">>> [4/8] package.json 无变化，跳过 npm install"
    fi

    echo ">>> [5/8] 构建前端 (npm run build)..."
    cd "$BLOG_DIR"
    npm run build
    echo "  前端构建完成，产物在 $DIST_DIR"
else
    echo ">>> [4/8] 未检测到 Node.js，跳过前端依赖安装"
    echo ">>> [5/8] 未检测到 Node.js，跳过前端构建"
    echo "  ⚠️ dist/ 未更新。请在本地 Windows 上运行 deploy/transfer_dist.ps1 传输"
    echo "     或手动: 本地 npm run build → scp -r dist/ pi@WalnutPi:/home/pi/blog/"
fi

# 6. Django 数据库迁移 + 收拢静态文件
echo ">>> [6/8] 执行 Django migrate + collectstatic..."
cd "$DJANGO_DIR"
source "$DJANGO_DIR/.venv/bin/activate"
# 加载 .env 环境变量（prod 设置需要 DJANGO_SECRET_KEY 等）
if [ -f "$DJANGO_DIR/.env" ]; then
    set -a
    source "$DJANGO_DIR/.env"
    set +a
fi
python manage.py migrate --settings=blog_backend.settings.prod
python manage.py collectstatic --noinput --settings=blog_backend.settings.prod

# 7. 重启服务
echo ">>> [7/8] 重启 gunicorn + reload nginx..."
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
