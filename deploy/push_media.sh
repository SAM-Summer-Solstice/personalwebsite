#!/bin/bash
# 将核桃派上的 media 目录推送到私人 GitHub 备份仓库
# 用法：在核桃派上执行 bash /home/pi/blog/deploy/push_media.sh
#
# 前提（一次性配置，详见 deploy/media-backup-setup.md）：
#   1. 已在 GitHub 创建私人仓库 blog-media-backup
#   2. 已在核桃派生成 media 专用密钥：ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_media
#   3. 已把公钥添加到 GitHub 仓库的 Deploy Keys（勾选 Allow write access）
#   4. 已在 ~/.ssh/config 配置 Host github.com-media 指向该密钥
#
# 执行流程：
#   检查 media 目录 → clone（首次）→ rsync 同步 media → git commit & push

set -e

# ========== 配置区 ==========
# 使用 github.com-media 别名（在 ~/.ssh/config 中定义），SSH 会自动选用 id_ed25519_media
MEDIA_REPO_URL="git@github.com-media:SAM-Summer-Solstice/blog-media-backup.git"

BLOG_DIR=/home/pi/blog
MEDIA_SOURCE="$BLOG_DIR/server/django/media"
BACKUP_WORKSPACE="/home/pi/media-backup"
# =============================

echo "=== 推送 media 到私人备份仓库 ==="

# 1. 检查源目录
if [ ! -d "$MEDIA_SOURCE" ]; then
    echo "  media 目录不存在: $MEDIA_SOURCE"
    echo "  还没有上传过任何文件，跳过。"
    exit 0
fi

# 统计源文件
FILE_COUNT=$(find "$MEDIA_SOURCE" -type f | wc -l)
echo "  源目录: $MEDIA_SOURCE"
echo "  文件数: $FILE_COUNT"

if [ "$FILE_COUNT" -eq 0 ]; then
    echo "  media 目录为空，跳过。"
    exit 0
fi

# 2. 准备备份工作区
if [ ! -d "$BACKUP_WORKSPACE/.git" ]; then
    echo ">>> 首次使用：clone 备份仓库..."
    git clone "$MEDIA_REPO_URL" "$BACKUP_WORKSPACE"
else
    echo ">>> 拉取备份仓库最新状态..."
    cd "$BACKUP_WORKSPACE"
    git pull --rebase || true
fi

# 3. 用 rsync 同步 media（--delete 保持一致，删除已不存在的文件）
echo ">>> 同步 media 文件..."
mkdir -p "$BACKUP_WORKSPACE/media"
rsync -a --delete "$MEDIA_SOURCE/" "$BACKUP_WORKSPACE/media/"

# 4. 提交并推送
cd "$BACKUP_WORKSPACE"
git add -A

# 检查是否有变化
if git diff --cached --quiet; then
    echo "  无变化，无需推送。"
    echo "=== 推送完成（无变化）==="
    exit 0
fi

COMMIT_MSG="media backup $(date +%Y-%m-%d_%H:%M:%S)"
git commit -m "$COMMIT_MSG"

echo ">>> 推送到 GitHub..."
git push origin main || git push origin master

echo ""
echo "=== 推送完成 ==="
echo "  commit: $COMMIT_MSG"
echo "  文件数: $FILE_COUNT"
echo ""
echo "注意: GitHub 单文件限制 100MB。"
echo "      如有大视频，建议用外部平台（B站/YouTube）嵌入链接。"
