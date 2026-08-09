# Checklist

- [ ] 核桃派 80 端口可访问：前台 React SPA 正常（路由/3D 星图/吊牌/GSAP 动效/终端）
- [ ] `/admin/` 后台可登录编辑：markdownx 实时预览、图片/附件上传落盘核桃派 `media/`
- [ ] `/api/*` 生产可用：posts/projects/about/views/comments/like/register/token/me 全部正常
- [ ] 登录/注册、评论、点赞、附件下载流程在生产正常
- [ ] systemd 自启：核桃派重启后 Nginx + Gunicorn 自动恢复
- [ ] 生产安全：`pi` 密码已更改、`DEBUG=False`、SECRET_KEY 走环境变量、防火墙仅开放必要端口
- [ ] 备份机制：crontab 定期备份 `db.sqlite3` + `media/`
- [ ] 数据完整：内容/用户/评论/附件迁移到核桃派，与本地一致
- [ ] 开发模式未破坏：本地 `npm run build` 与 `manage.py check` 仍通过
