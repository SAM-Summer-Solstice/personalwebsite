# 从核桃派拉取数据库备份到本地电脑
# 用法：右键"使用 PowerShell 运行"，或在终端执行 powershell -ExecutionPolicy Bypass -File pull_backup.ps1
#
# 功能：
#   1. 通过 SSH 从核桃派拉取 /home/pi/blog/backups/ 下的数据库备份
#   2. 保存到本地 D:\xzx\JUST_FOR_FUN\github\personalwebsite\backups\ 目录
#   3. 清理 30 天前的本地备份
#   4. 记录拉取日志
#
# 前提：
#   - 已能用 ssh pi@10.83.36.241 免密登录（或会提示输入密码）
#   - 核桃派上的 backup_db.sh cron 任务正常运行

# ========== 配置区 ==========
$PI_HOST = "10.83.36.241"
$PI_USER = "pi"
$REMOTE_BACKUP_DIR = "/home/pi/blog/backups"
$LOCAL_BACKUP_DIR = "D:\xzx\JUST_FOR_FUN\github\personalwebsite\backups"
$RETENTION_DAYS = 30
# ============================

$LOG_FILE = Join-Path $LOCAL_BACKUP_DIR "pull_backup.log"
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# 确保本地目录存在
if (-not (Test-Path $LOCAL_BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $LOCAL_BACKUP_DIR -Force | Out-Null
}

Write-Host "=== 从核桃派拉取数据库备份 ===" -ForegroundColor Cyan
Write-Host "  核桃派: $PI_USER@$PI_HOST"
Write-Host "  远程目录: $REMOTE_BACKUP_DIR"
Write-Host "  本地目录: $LOCAL_BACKUP_DIR"
Write-Host ""

# 记录日志
$logEntry = "[$TIMESTAMP] 开始拉取备份..."
Add-Content -Path $LOG_FILE -Value $logEntry

# 1. 检查核桃派是否可达
Write-Host ">>> [1/4] 检查核桃派连通性..." -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $PI_HOST -Count 1 -Quiet -ErrorAction SilentlyContinue
if (-not $pingResult) {
    $errorMsg = "[$TIMESTAMP] 错误: 无法连接到核桃派 $PI_HOST"
    Add-Content -Path $LOG_FILE -Value $errorMsg
    Write-Host "  无法连接到核桃派，请检查网络。" -ForegroundColor Red
    exit 1
}
Write-Host "  核桃派可达" -ForegroundColor Green

# 2. 拉取备份文件（使用 scp 递归拉取，不覆盖已有文件）
Write-Host ">>> [2/4] 拉取备份文件..." -ForegroundColor Yellow

# 先列出远程备份文件
$remoteFiles = ssh "${PI_USER}@${PI_HOST}" "ls -1 $REMOTE_BACKUP_DIR/db_backup_*.sqlite3.gz 2>/dev/null" 2>$null
if ($LASTEXITCODE -ne 0 -or -not $remoteFiles) {
    $warnMsg = "[$TIMESTAMP] 警告: 远程没有找到备份文件"
    Add-Content -Path $LOG_FILE -Value $warnMsg
    Write-Host "  远程没有备份文件，可能 cron 任务还未执行。" -ForegroundColor Yellow
    exit 0
}

Write-Host "  发现远程备份文件:"
$remoteFiles -split "`n" | ForEach-Object { if ($_.Trim()) { Write-Host "    $_" } }

# 逐个拉取（跳过已存在的）
$transferred = 0
$skipped = 0
foreach ($file in ($remoteFiles -split "`n" | Where-Object { $_ -and $_.Trim() })) {
    $file = $file.Trim()
    $fileName = Split-Path $file -Leaf
    $localPath = Join-Path $LOCAL_BACKUP_DIR $fileName

    if (Test-Path $localPath) {
        Write-Host "  跳过（已存在）: $fileName" -ForegroundColor DarkGray
        $skipped++
    } else {
        Write-Host "  拉取: $fileName ... " -NoNewline
        scp -q "${PI_USER}@${PI_HOST}:$file" "$localPath" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "完成" -ForegroundColor Green
            $transferred++
        } else {
            Write-Host "失败" -ForegroundColor Red
        }
    }
}

# 3. 清理 30 天前的本地备份
Write-Host ">>> [3/4] 清理 ${RETENTION_DAYS} 天前的本地备份..." -ForegroundColor Yellow
$cutoffDate = (Get-Date).AddDays(-$RETENTION_DAYS)
$oldFiles = Get-ChildItem -Path $LOCAL_BACKUP_DIR -Filter "db_backup_*.sqlite3.gz" | Where-Object { $_.LastWriteTime -lt $cutoffDate }
if ($oldFiles) {
    foreach ($f in $oldFiles) {
        Remove-Item $f.FullName -Force
        Write-Host "  删除: $($f.Name)" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "  无需清理" -ForegroundColor Green
}

# 4. 统计并记录日志
Write-Host ">>> [4/4] 统计..." -ForegroundColor Yellow
$localBackupCount = (Get-ChildItem -Path $LOCAL_BACKUP_DIR -Filter "db_backup_*.sqlite3.gz" -ErrorAction SilentlyContinue | Measure-Object).Count
$localBackupSize = (Get-ChildItem -Path $LOCAL_BACKUP_DIR -Filter "db_backup_*.sqlite3.gz" -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
if ($localBackupSize) {
    $sizeStr = "{0:N2} KB" -f ($localBackupSize / 1KB)
} else {
    $sizeStr = "0 KB"
}

$summary = "[$TIMESTAMP] 完成: 拉取 $transferred 个, 跳过 $skipped 个, 本地共 $localBackupCount 个 ($sizeStr)"
Add-Content -Path $LOG_FILE -Value $summary

Write-Host ""
Write-Host "=== 拉取完成 ===" -ForegroundColor Cyan
Write-Host "  本次拉取: $transferred 个"
Write-Host "  跳过: $skipped 个"
Write-Host "  本地备份: $localBackupCount 个 ($sizeStr)"
Write-Host "  日志: $LOG_FILE"
