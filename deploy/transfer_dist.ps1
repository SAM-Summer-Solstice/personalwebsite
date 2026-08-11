# 本地构建前端 dist/ 并传输到核桃派
# 用法：右键"使用 PowerShell 运行"，或在终端执行 powershell -ExecutionPolicy Bypass -File transfer_dist.ps1
#
# 功能：
#   1. 本地执行 npm run build 生成最新 dist/
#   2. 打包 dist/ 为 dist.tar.gz
#   3. scp 传输到核桃派 /home/pi/blog/
#   4. 远程解压并清理压缩包
#   5. reload Nginx 让前端变更生效
#
# 前提：
#   - 本地已安装 Node.js + npm
#   - 已能用 ssh pi@10.83.36.241 免密登录（或会提示输入密码）
#   - 核桃派上 /home/pi/blog/ 已部署（含 Nginx 配置）

# ========== 配置区 ==========
$PI_HOST = "10.83.36.241"
$PI_USER = "pi"
$REMOTE_BLOG_DIR = "/home/pi/blog"
$PROJECT_ROOT = "D:\xzx\JUST_FOR_FUN\github\personalwebsite"
# ============================

$DIST_DIR = Join-Path $PROJECT_ROOT "dist"
$TAR_FILE = Join-Path $PROJECT_ROOT "dist.tar.gz"

Write-Host "=== 构建并传输前端 dist 到核桃派 ===" -ForegroundColor Cyan
Write-Host ("  核桃派: " + $PI_USER + "@" + $PI_HOST)
Write-Host ("  远程目录: " + $REMOTE_BLOG_DIR)
Write-Host ("  项目根: " + $PROJECT_ROOT)
Write-Host ""

# 切换到项目根目录
Set-Location $PROJECT_ROOT

# 1. 本地构建前端
Write-Host ">>> [1/5] 构建前端 (npm run build)" -ForegroundColor Yellow
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "  未检测到 npm，请先安装 Node.js。" -ForegroundColor Red
    exit 1
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  前端构建失败。" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $DIST_DIR)) {
    Write-Host "  构建后未找到 dist/ 目录。" -ForegroundColor Red
    exit 1
}
$distSize = (Get-ChildItem -Path $DIST_DIR -Recurse -File | Measure-Object -Property Length -Sum).Sum
$sizeStr = "{0:N2} KB" -f ($distSize / 1KB)
Write-Host ("  前端构建完成，dist/ 大小: " + $sizeStr) -ForegroundColor Green

# 2. 打包 dist 目录
Write-Host ">>> [2/5] 打包 dist 为 dist.tar.gz" -ForegroundColor Yellow
if (Test-Path $TAR_FILE) {
    Remove-Item $TAR_FILE -Force
}
# 使用 tar 打包（Windows 10+ 自带 bsdtar；注意路径不能带尾部斜杠）
tar -czf $TAR_FILE dist
if ($LASTEXITCODE -ne 0) {
    Write-Host "  打包失败。" -ForegroundColor Red
    exit 1
}
$tarSize = (Get-Item $TAR_FILE).Length
$tarSizeStr = "{0:N2} KB" -f ($tarSize / 1KB)
Write-Host ("  打包完成: " + $tarSizeStr) -ForegroundColor Green

# 3. 传输到核桃派
Write-Host ">>> [3/5] 传输 dist.tar.gz 到核桃派" -ForegroundColor Yellow
scp $TAR_FILE "${PI_USER}@${PI_HOST}:$REMOTE_BLOG_DIR/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  传输失败，请检查 SSH 连接。" -ForegroundColor Red
    exit 1
}
Write-Host "  传输完成" -ForegroundColor Green

# 4. 远程解压并清理
Write-Host ">>> [4/5] 远程解压并清理" -ForegroundColor Yellow
$remoteCmd = 'cd ' + $REMOTE_BLOG_DIR + ' && rm -rf dist && tar -xzf dist.tar.gz && rm dist.tar.gz'
ssh "${PI_USER}@${PI_HOST}" $remoteCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "  远程解压失败。" -ForegroundColor Red
    exit 1
}
Write-Host "  远程解压完成，已清理压缩包" -ForegroundColor Green

# 5. 清理本地压缩包 + reload Nginx
Write-Host ">>> [5/5] reload Nginx" -ForegroundColor Yellow
Remove-Item $TAR_FILE -Force -ErrorAction SilentlyContinue
ssh "${PI_USER}@${PI_HOST}" "sudo systemctl reload nginx"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Nginx reload 失败，请检查 Nginx 状态。" -ForegroundColor Red
    exit 1
}
Write-Host "  Nginx 已 reload" -ForegroundColor Green

Write-Host ""
Write-Host "=== 传输完成 ===" -ForegroundColor Cyan
Write-Host ("  dist/ 已更新到 " + $REMOTE_BLOG_DIR + "/dist/")
Write-Host "  Nginx 已 reload，前端变更已生效"
