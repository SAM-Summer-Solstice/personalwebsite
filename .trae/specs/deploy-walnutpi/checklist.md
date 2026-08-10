# Checklist

## 项目结构优化
- [x] Django 配置已分层：`server/django/blog_backend/settings/` 含 `base.py`、`dev.py`、`prod.py`
- [x] `prod.py` 含 HTTPS 安全配置（SECURE_SSL_REDIRECT / SESSION_COOKIE_SECURE / CSRF_COOKIE_SECURE / CSRF_TRUSTED_ORIGINS）
- [x] `manage.py` / `wsgi.py` 默认使用 `blog_backend.settings.dev`（开发模式行为不变）
- [x] `server/django/requirements.txt` 已创建且锁定依赖版本
- [x] `deploy/` 目录已创建，含 `nginx.conf`（IPv6+SSL）、`gunicorn.service`、`deploy.sh`、`.env.example`
- [x] 遗留清理完成：`server/index.js` 已删除；`package.json` 无 `@giscus/react` 与 `server` 脚本；`server/README.md` 已更新

## IPv6 公网与域名
- [ ] 核桃派已确认有公网 IPv6 地址（非 fe80/fd00）
- [ ] DNS：`www.xuzixuan.top` 的 AAAA 记录已指向核桃派公网 IPv6
- [ ] （若 IPv6 会变）DDNS 已部署并定期更新 AAAA 记录
- [ ] ufw 与路由器/光猫 IPv6 防火墙已放行入站 80/443
- [ ] 外网经 IPv6 可达核桃派 80/443（curl -6 验证）

## HTTPS 证书
- [ ] `certbot --nginx -d www.xuzixuan.top` 成功申请证书
- [ ] Nginx 443 已启用 SSL，80 自动 301 重定向到 443
- [ ] certbot timer 已启用（自动续期）
- [ ] 浏览器访问 `https://www.xuzixuan.top/` 证书有效（无自签警告）

## 部署与访问
- [ ] 公网 `https://www.xuzixuan.top/`：前台 React SPA 正常（路由/3D 星图/吊牌/GSAP 动效/终端）
- [ ] `https://www.xuzixuan.top/admin/`：后台可登录编辑，markdownx 预览、图片/附件上传落盘核桃派 `media/`，POST 不报 CSRF 403
- [ ] `https://www.xuzixuan.top/api/*`：posts/projects/about/views/comments/like/register/token/me 全部正常
- [ ] 内网 `http://10.83.36.241/` 可用（HTTP 回退）
- [ ] Tailscale `http://100.93.171.11/` 可用（公网故障时备用）

## 服务管理
- [ ] systemd 自启：核桃派重启后 Nginx + Gunicorn 自动恢复
- [ ] Gunicorn 使用 prod settings，2 workers，bind 127.0.0.1:8000
- [ ] Nginx 配置：监听 80+443（IPv6+IPv4）、静态/媒体/SPA fallback + 反代 /api /admin /markdownx、80→443 重定向

## 安全与备份
- [ ] 生产安全：`pi` 密码已更改、SSH 禁用密码登录（仅密钥）、`DEBUG=False`、SECRET_KEY 走环境变量、HTTPS 安全头生效
- [ ] ufw 仅开放 80/443（公网）+ 22（仅内网/Tailscale）
- [ ] 访问不存在路径返回 404（非 Django 调试页）
- [ ] 备份机制：crontab 定期备份 `db.sqlite3` + `media/`

## 数据与兼容
- [ ] 数据完整：内容/用户/评论/附件迁移到核桃派，与本地一致
- [x] 开发模式未破坏：本地 `npm run build` 与 `manage.py check`（dev settings）仍通过
