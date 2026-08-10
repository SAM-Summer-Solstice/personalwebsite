#!/bin/bash
set -e

echo "=== Task 6.1 验证服务开机自启状态 ==="

echo "--- gunicorn 开机自启 ---"
sudo systemctl is-enabled gunicorn

echo "--- nginx 开机自启 ---"
sudo systemctl is-enabled nginx

echo "--- 当前服务状态 ---"
echo "gunicorn: $(sudo systemctl is-active gunicorn)"
echo "nginx: $(sudo systemctl is-active nginx)"

echo ""
echo "=== Task 6.2 模拟重启验证（不实际重启，检查服务依赖）==="

echo "--- gunicorn 服务单元内容 ---"
sudo systemctl cat gunicorn | grep -E '(After=|WantedBy=|Restart=)'

echo "--- nginx 服务单元内容 ---"
sudo systemctl cat nginx | grep -E '(After=|WantedBy=|Restart=)'

echo ""
echo "=== Task 6.3 配置数据库备份 cron ==="

BACKUP_DIR="/home/pi/blog/backups"
mkdir -p "$BACKUP_DIR"

echo "--- 3.1 创建备份脚本 ---"
cat > /home/pi/blog/backup_db.sh <<'BACKUP_EOF'
#!/bin/bash
# Django SQLite 数据库每日备份
# 保留最近 30 天的备份

BACKUP_DIR="/home/pi/blog/backups"
DB_FILE="/home/pi/blog/server/django/db.sqlite3"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_${DATE}.sqlite3"

# 使用 sqlite3 的 .backup 命令（在线备份，不锁库）
sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"

# 压缩
gzip "$BACKUP_FILE"

# 清理 30 天前的备份
find "$BACKUP_DIR" -name "db_backup_*.sqlite3.gz" -mtime +30 -delete

echo "[$(date)] 备份完成: $BACKUP_FILE.gz"
BACKUP_EOF

chmod +x /home/pi/blog/backup_db.sh
echo "  备份脚本已创建: /home/pi/blog/backup_db.sh"

echo "--- 3.2 安装 sqlite3（如果未安装）---"
which sqlite3 >/dev/null 2>&1 || sudo apt-get install -y sqlite3
which sqlite3 && echo "  sqlite3 已就绪"

echo "--- 3.3 测试备份脚本 ---"
bash /home/pi/blog/backup_db.sh
ls -lh "$BACKUP_DIR"/

echo "--- 3.4 添加 cron 任务（每天凌晨 3 点备份）---"
(crontab -l 2>/dev/null | grep -v 'backup_db.sh'; echo "0 3 * * * /home/pi/blog/backup_db.sh >> /home/pi/blog/backups/backup.log 2>&1") | crontab -
echo "  cron 任务已添加"

echo "--- 3.5 查看 cron 任务 ---"
crontab -l

echo ""
echo "=== Task 6.4 检查系统资源占用 ==="

echo "--- 内存使用 ---"
free -h

echo "--- 磁盘使用 ---"
df -h /

echo "--- gunicorn + nginx 内存占用 ---"
ps aux | grep -E '(gunicorn|nginx)' | grep -v grep | awk '{printf "  %-8s PID=%-6s MEM=%-5s RSS=%sKB\n", $1, $2, $4, $6}'

echo ""
echo "=== verify_services.sh 完成 ==="
