# 核桃派部署操作指导（基于实测环境）

> 本指导基于 2026-08-10 对核桃派（10.83.36.241）的 SSH 实测环境生成，对应 `tasks.md` 的 Task 2–6。
> Task 1（项目结构优化）已在本地完成，`deploy/` 目录与 `server/django/requirements.txt` 就绪。

---

## 0. 环境探测结论（实测）

### 0.1 系统与资源

| 项目 | 实测值 | 评估 |
|---|---|---|
| OS | Debian GNU/Linux 12 (bookworm), aarch64 | ✅ 满足 |
| 内核 | Linux WalnutPi 6.1.31 | ✅ |
| CPU | 4 核 | ✅ 充足 |
| 内存 | 981 MiB（可用约 700 MiB，docker 占用中） | ⚠️ 偏紧，需加 swap |
| Swap | **0 B（无交换分区）** | ❌ **必须创建**，否则 Gunicorn+Django 易 OOM |
| 磁盘 | eMMC 59G，已用 9%，可用 52G | ✅ 充足 |
| Python | 3.11.2（/usr/bin/python3），pip 23.0.1 | ✅ |
| python3-venv | **未安装**（dpkg 无记录） | ❌ 需 apt 安装 |
| git | 2.39.5 | ✅ |
| nginx | **未安装** | ❌ 需 apt 安装 |
| certbot | **未安装** | ❌ 需 apt 安装 |
| ufw | **未安装** | ❌ 需 apt 安装 |
| docker | 已装且运行（docker0 接口存在） | ⚠️ 占内存，建议禁用 |

### 0.2 网络与 IPv6（关键阻塞）

| 项目 | 实测值 | 评估 |
|---|---|---|
| 联网接口 | **wlan0**（无线，10.83.36.241/24）；eth0 DOWN（未插网线） | ⚠️ 无线稳定性弱于有线 |
| IPv4 公网 | 无（内网 10.83.36.241） | 预期内 |
| IPv6 公网 | **无**（仅 `::1` 回环 + wlan0 `fe80::` 链路本地 + Tailscale `fd7a:...` ULA） | ❌ **Task 5 阻塞** |
| IPv6 系统开关 | `disable_ipv6=0`（已启用），`accept_ra=1`（已接收路由通告） | ✅ 系统侧已就绪 |
| IPv6 默认路由 | 无 | ❌ 路由器/光猫未下发 IPv6 前缀 |
| Tailscale | 已激活（IPv4 100.93.171.11，IPv6 fd7a:115c:a1e0::a638:ab0b） | ✅ 可作异网回退 |
| DNS | 100.100.100.100 + fd7a:...::53（Tailscale MagicDNS） | ✅ |

**结论：核桃派系统侧 IPv6 已开启（`disable_ipv6=0`、`accept_ra=1`），但上游路由器/光猫没有下发 IPv6 全局前缀，因此 wlan0 拿不到公网 IPv6 地址。** 这不是核桃派的问题，是家庭网络/运营商侧的问题，需在路由器/光猫上开启 IPv6 后核桃派会自动获取（无需改核桃派配置）。

### 0.3 防火墙与服务

| 项目 | 实测值 | 评估 |
|---|---|---|
| ufw | 未安装 | ❌ 需安装 |
| nftables / ip6tables | 仅 Tailscale 规则，INPUT policy ACCEPT | ⚠️ 全开放，需 ufw 收紧 |
| 监听端口 | 仅 22（SSH，IPv4+IPv6） | ✅ 80/443/8000 未被占用 |
| systemd | `is-system-running` = `starting`（无 failed 单元） | ⚠️ 可能 docker 拖慢 boot，见 0.4 |

### 0.4 关于 systemd "starting"

`systemctl is-system-running` 返回 `starting` 而非 `running`，通常意味着部分单元未达到 active 状态（常见于 docker 等长启动服务）。实测 `systemctl --failed` 为空（无失败单元），不影响部署，但建议在 Task 2 禁用 docker 后再观察一次。

---

## 1. Task 2：核桃派环境准备

### 2.0 前置：SSH 免密已就绪

本机已配置 SSH 密钥（`~/.ssh/id_ed25519` → 核桃派 `pi@10.83.36.241`），后续所有 SSH 命令均免密执行。验证：

```powershell
ssh -o BatchMode=yes pi@10.83.36.241 "hostname; whoami"
# 期望输出：WalnutPi \n pi
```

### 2.1 创建 Swap（**必做，优先级最高**）

核桃派 1GB 内存无 swap，Django+Gunicorn+Nginx 同时运行极易 OOM。创建 2GB swap 文件：

```bash
# 在核桃派上执行（SSH 进入后）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# 持久化（重启后仍生效）
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
# 验证
free -h   # Swap 行应显示约 2.0Gi
```

> 说明：`fallocate` 在 ext4 上秒级完成；若文件系统不支持，改用 `sudo dd if=/dev/zero of=/swapfile bs=1M count=2048`。

### 2.2 （推荐）禁用 docker 释放内存

docker 守护进程常驻约 100–300MB，博客部署不需要它：

```bash
sudo systemctl disable --now docker
sudo systemctl disable --now containerd 2>/dev/null
free -h   # 可用内存应上升
```

### 2.3 安装系统软件

```bash
sudo apt update
sudo apt install -y nginx python3-venv python3-certbot-nginx certbot ufw rsync
```

说明：
- `nginx`：Web 服务器 + 反向代理
- `python3-venv`：创建 Python 虚拟环境（**当前缺失，必装**）
- `certbot` + `python3-certbot-nginx`：Let's Encrypt 证书自动申请与 nginx 插件
- `ufw`：防火墙
- `rsync`：增量同步代码（可选，scp 亦可）

验证：

```bash
nginx -v              # 期望: nginx version: nginx/1.22.x
python3 -m venv --help | head -1   # 期望: usage: venv ...
certbot --version     # 期望: certbot 2.x
ufw version | head -1
```

### 2.4 创建部署目录与虚拟环境

```bash
mkdir -p /home/pi/blog
cd /home/pi/blog/server/django 2>/dev/null || mkdir -p /home/pi/blog/server/django && cd /home/pi/blog/server/django
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple
```

> 虚拟环境先建好，依赖在第 3 步代码传上去后再装。

### 2.5 IPv6 公网开通（**Task 5 前置，可与 2.1–2.4 并行处理**）

核桃派系统侧已就绪（`disable_ipv6=0`、`accept_ra=1`），需在**家庭网络侧**开启 IPv6。按以下顺序排查：

1. **光猫/路由器开启 IPv6**：登录路由器管理后台（通常 192.168.1.1 或 10.83.36.1），找到「IPv6」开关并启用。部分运营商光猫需「桥接 + 路由器拨号」才能拿到 IPv6 前缀。
2. **确认运营商支持**：多数国内宽带已默认下发 IPv6（移动/电信/联通）。若路由器已开 IPv6 但核桃派仍无全局地址，联系运营商确认是否开通。
3. **验证核桃派已获取公网 IPv6**：
   ```bash
   ip -6 addr show wlan0 | grep -v 'fe80\|fd7a'
   # 期望出现 240x:... 或 2001:... 等全局地址（scope global，非 fe80/fd7a）
   curl -6 --max-time 10 https://api6.ipify.org && echo
   # 期望返回一串公网 IPv6 地址
   ```
4. **若前缀会变**（多数家庭宽带 IPv6 前缀会定期变化）：部署 DDNS，见 Task 5.1。

> **若短期无法开通 IPv6**：Task 2/3/4 可照常进行（内网 HTTP + Tailscale 异网访问先行），Task 5 等 IPv6 就绪后再做。Tailscale 还支持 `tailscale cert` 签发受信证书，可作过渡方案。

---

## 2. Task 3：代码与数据部署

### 3.1 本地构建前端

在 Windows 开发机（项目根目录）：

```powershell
npm run build
# 产物在 dist/
```

### 3.2 传输代码到核桃派

推荐 rsync（增量、断点续传）。在项目根目录执行：

```powershell
# 传后端代码（排除虚拟环境、本地数据库、本地媒体）
rsync -avz --delete `
  --exclude '.venv' --exclude 'db.sqlite3' --exclude 'media' --exclude '__pycache__' --exclude '*.pyc' `
  server/django/ pi@10.83.36.241:/home/pi/blog/server/django/

# 传前端构建产物
rsync -avz --delete dist/ pi@10.83.36.241:/home/pi/blog/dist/

# 传部署脚本与配置（便于在核桃派上查阅）
rsync -avz deploy/ pi@10.83.36.241:/home/pi/blog/deploy/
```

> 若 Windows 无 rsync，改用 scp：
> ```powershell
> scp -r server/django pi@10.83.36.241:/home/pi/blog/server/
> scp -r dist pi@10.83.36.241:/home/pi/blog/
> scp -r deploy pi@10.83.36.241:/home/pi/blog/
> ```
> 然后在核桃派上手动清理 `.venv`、`db.sqlite3`、`media`。

### 3.3 安装 Python 依赖

在核桃派上：

```bash
cd /home/pi/blog/server/django
source .venv/bin/activate
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

> ARM64（aarch64）下 Django/DRF/markdownx/simplejwt/gunicorn 均有纯 Python 或 aarch64 wheel，无需编译。

### 3.4 创建 .env 与生成 SECRET_KEY

```bash
cd /home/pi/blog/server/django
cp /home/pi/blog/deploy/.env.example .env
# 生成随机密钥并写入 .env
SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
sed -i "s|DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$SECRET_KEY|" .env
# 检查
cat .env
```

> `.env` 的 `ALLOWED_HOSTS` 与 `CSRF_TRUSTED_ORIGINS` 已在模板中预置 `www.xuzixuan.top`、`10.83.36.241`、`100.93.171.11`、`localhost`，无需改动。

### 3.5 数据落地

**方案 A（推荐）：迁移现有数据**

```powershell
# 在 Windows 开发机，传数据库与媒体
scp server/django/db.sqlite3 pi@10.83.36.241:/home/pi/blog/server/django/
scp -r server/django/media pi@10.83.36.241:/home/pi/blog/server/django/
```

**方案 B：在核桃派重建**

```bash
cd /home/pi/blog/server/django
source .venv/bin/activate
# 执行 Markdown 导入（若项目有 import_md 命令）
python manage.py import_md --settings=blog_backend.settings.prod
# 创建超级用户
python manage.py createsuperuser --settings=blog_backend.settings.prod
```

### 3.6 执行迁移与 collectstatic

```bash
cd /home/pi/blog/server/django
source .venv/bin/activate
python manage.py migrate --settings=blog_backend.settings.prod
python manage.py collectstatic --noinput --settings=blog_backend.settings.prod
# 产物落在 static_collected/
```

### 3.7 验证 Django 配置无误

```bash
python manage.py check --settings=blog_backend.settings.prod
# 期望: System check identified no issues (0 silenced).
```

---

## 3. Task 4：生产配置与启动（先 HTTP）

### 4.1 安装 Gunicorn systemd 单元

```bash
sudo cp /home/pi/blog/deploy/gunicorn.service /etc/systemd/system/gunicorn.service
sudo systemctl daemon-reload
sudo systemctl enable --now gunicorn
sudo systemctl status gunicorn   # 期望 active (running)
```

> `gunicorn.service` 已配置：2 workers、bind 127.0.0.1:8000、prod settings、MemoryMax=900M、崩溃自重启。本机 `deploy/gunicorn.service` 即模板，无需修改（路径已对齐 `/home/pi/blog/`）。

验证 Gunicorn 监听：

```bash
ss -tlnp | grep 8000
# 期望: LISTEN 127.0.0.1:8000
```

### 4.2 安装 Nginx 配置（先只 HTTP 80）

```bash
# 拷贝站点配置
sudo cp /home/pi/blog/deploy/nginx.conf /etc/nginx/sites-available/blog
sudo ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
# 移除默认站点（避免 80 端口冲突）
sudo rm -f /etc/nginx/sites-enabled/default
# 测试配置
sudo nginx -t
# 期望: configuration file /etc/nginx/nginx.conf test is successful
sudo systemctl reload nginx
sudo systemctl enable nginx
```

> `nginx.conf` 已配置：80 端口 IPv4+IPv6 监听、`/static` `/media` 直接服务、`/` SPA fallback、`/api` `/admin` `/markdownx` 反代 8000。443 段留给 certbot 自动生成。

### 4.3 防火墙（ufw）

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH（内网）
sudo ufw allow 80/tcp        # HTTP
sudo ufw allow 443/tcp       # HTTPS（为 Task 5 预留）
sudo ufw enable
sudo ufw status verbose
```

> ufw 默认同时作用于 IPv4 与 IPv6，无需额外配置。

### 4.4 验证 HTTP 访问

在**同一局域网**的任意设备浏览器打开：

```
http://10.83.36.241/
```

期望：React 前台首页正常加载（3D 星图、吊牌、GSAP 动效）。

验证 API 与后台：

```
http://10.83.36.241/api/posts/
http://10.83.36.241/admin/
```

> 若 502：检查 `sudo systemctl status gunicorn` 与 `sudo journalctl -u gunicorn -e`。
> 若静态 404：检查 `collectstatic` 是否执行、`static_collected/` 是否有内容。

### 4.5 验证 Tailscale 异网回退

在异网设备（如手机断开 WiFi 用 4G，但开 Tailscale）访问：

```
http://100.93.171.11/
```

期望：同样可访问站点（HTTP，无证书）。

---

## 4. Task 5：IPv6 公网 + 域名 + HTTPS

> ⚠️ **前置条件**：Task 2.5 已完成，核桃派 wlan0 已获取公网 IPv6（`ip -6 addr show wlan0` 有非 fe80/fd7a 的全局地址）。

### 5.1 DNS 配置（AAAA 记录）

在域名 `xuzixuan.top` 的 DNS 管理后台（如阿里云/Cloudflare/腾讯云）：

- 添加记录：
  - 类型：**AAAA**
  - 主机：`www`
  - 值：核桃派公网 IPv6 地址（从 `curl -6 https://api6.ipify.org` 获取）
  - TTL：600（或默认）

验证 DNS 生效（等待 1–10 分钟）：

```bash
# 在任意外网设备
nslookup -type=AAAA www.xuzixuan.top
# 或
dig AAAA www.xuzixuan.top +short
```

**若 IPv6 前缀会变**（家庭宽带常见）：部署 DDNS。推荐 `ddns-go`（Go 写的轻量 DDNS，支持阿里云/Cloudflare 等）：

```bash
# 在核桃派
sudo apt install -y ddns-go    # 或从 https://github.com/jeessy2/ddns-go releases 下载 arm64
sudo systemctl enable --now ddns-go
# 访问 http://10.83.36.241:9876 配置 DNS 提供商 token 与域名
```

### 5.2 验证外网 IPv6 可达

在外网设备（如 4G 手机，关 WiFi）：

```bash
curl -6 -I http://www.xuzixuan.top/
# 期望: HTTP/1.1 200 OK（nginx 返回）
```

> 若超时：检查路由器/光猫 IPv6 防火墙是否放行入站 80/443（部分路由器默认拦截 IPv6 入站）。核桃派侧 ufw 已在 4.3 放行。

### 5.3 申请 Let's Encrypt 证书

在核桃派：

```bash
sudo certbot --nginx -d www.xuzixuan.top
```

certbot 会：
1. 通过 HTTP-01 验证域名所有权（需 DNS 已生效 + 80 可公网访问）
2. 自动修改 `/etc/nginx/sites-enabled/blog`：80 段改为 301 重定向到 443，追加 443 ssl 段
3. 注册 systemd timer 自动续期

按提示：
- 输入邮箱（用于证书到期提醒）
- 同意服务条款
- 选择是否重定向 HTTP→HTTPS（**选是**）

验证：

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status certbot.timer   # 期望 active (waiting)
```

### 5.4 验证 HTTPS

在外网浏览器：

```
https://www.xuzixuan.top/
```

期望：
- 证书有效（锁标志，非自签警告）
- 前台、后台、API 全流程正常
- `http://www.xuzixuan.top/` 自动 301 跳转到 `https://`

---

## 5. Task 6：验证与安全

### 6.1 全功能回归

| 类别 | 验证点 | URL |
|---|---|---|
| 前台 | 首页/列表/单篇/项目/关于，3D 星图/吊牌/GSAP/终端 | `https://www.xuzixuan.top/` |
| 后台 | 登录、markdownx 预览、图片上传落盘 | `https://www.xuzixuan.top/admin/` |
| API | posts/projects/about/views/comments/like/register/token/me | `https://www.xuzixuan.top/api/posts/` 等 |
| 互动 | 登录注册、评论、点赞、附件下载 | 前台操作 |
| 内网回退 | HTTP 可用 | `http://10.83.36.241/` |
| Tailscale 回退 | 异网备用 | `http://100.93.171.11/` |
| 404 | 不存在路径返回 404（非调试页） | `https://www.xuzixuan.top/不存在的路径` |

### 6.2 重启自恢复测试

```bash
sudo reboot
# 等待 1 分钟后重新 SSH
ssh pi@10.83.36.241
sudo systemctl is-active nginx gunicorn
# 期望两行都是 active
```

### 6.3 安全基线

**更改 pi 密码**（当前 pi/pi 极不安全）：

```bash
passwd
# 输入新密码（强密码）
```

**SSH 禁用密码登录**（密钥已配置）：

```bash
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
# 验证：新开一个终端 ssh pi@10.83.36.241 应免密直接进入
```

> ⚠️ 改前务必确认密钥登录可用，否则会锁死自己。

**ufw 收紧**（公网仅 80/443，22 仅内网）：

```bash
# 若希望 22 仅内网可达（公网 SSH 高危）：
sudo ufw delete allow 22/tcp
sudo ufw allow from 10.83.36.0/24 to any port 22 proto tcp
sudo ufw allow from 100.64.0.0/10 to any port 22 proto tcp   # Tailscale CGNAT 段
sudo ufw reload
```

### 6.4 备份

```bash
mkdir -p /home/pi/backup
# 写备份脚本
cat > /home/pi/backup/backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M)
tar czf /home/pi/backup/blog_$DATE.tar.gz \
  /home/pi/blog/server/django/db.sqlite3 \
  /home/pi/blog/server/django/media
# 保留最近 14 天
find /home/pi/backup -name 'blog_*.tar.gz' -mtime +14 -delete
EOF
chmod +x /home/pi/backup/backup.sh
# 每日 03:00 执行
(crontab -l 2>/dev/null; echo '0 3 * * * /home/pi/backup/backup.sh') | crontab -
crontab -l   # 验证
```

---

## 6. 快速命令速查

| 场景 | 命令 |
|---|---|
| 查看服务状态 | `sudo systemctl status nginx gunicorn` |
| 查看实时日志 | `sudo journalctl -u gunicorn -f` |
| 重启 Gunicorn | `sudo systemctl restart gunicorn` |
| 重载 Nginx | `sudo systemctl reload nginx` |
| 重新部署（代码更新后） | `bash /home/pi/blog/deploy/deploy.sh` |
| 查看公网 IPv6 | `curl -6 https://api6.ipify.org && echo` |
| 查看证书状态 | `sudo certbot certificates` |
| 手动续期测试 | `sudo certbot renew --dry-run` |

---

## 7. 阻塞与风险汇总

| 编号 | 问题 | 影响 | 处理 |
|---|---|---|---|
| B1 | **无公网 IPv6** | Task 5 无法进行 | Task 2.5：路由器/光猫开启 IPv6 |
| B2 | **无 Swap** | Gunicorn 易 OOM | Task 2.1：创建 2GB swap（必做） |
| B3 | python3-venv/nginx/certbot/ufw 未装 | 无法部署 | Task 2.3：apt 安装 |
| R1 | 无线联网（wlan0） | 稳定性弱于有线 | 尽量插网线（启用 eth0） |
| R2 | docker 占内存 | 内存紧张 | Task 2.2：禁用 docker |
| R3 | systemd "starting" | 可能 docker 拖慢 | 禁用 docker 后观察 |
| R4 | IPv6 前缀会变 | DNS 失效 | Task 5.1：部署 ddns-go |

---

**指导完毕。** 建议执行顺序：Task 2.1（swap）→ 2.2（禁 docker）→ 2.3（装软件）→ 2.4（venv）→ Task 3 → Task 4 → Task 2.5（IPv6，可与前面并行）→ Task 5 → Task 6。
