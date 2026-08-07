# 浏览量服务（server/）

零依赖 Node 后端，统计文章浏览量（真实访问数据）。

## 本地启动

```bash
npm run server        # 监听 http://localhost:3210（可用 PORT 环境变量改端口）
```

开发环境运行 `npm run dev` 时，Vite 会把 `/api/*` 代理到该服务，前后端可直接联调。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/views/:postId` | 查询浏览量 → `{ views }` |
| POST | `/api/views/:postId` | 浏览量 +1 → `{ views }` |

数据持久化在 `server/data/views.json`（首次请求自动创建，原子写入），重启不丢。

## 部署到树莓派 / 服务器

1. 构建前端：`npm run build`（产物在 `dist/`）
2. 用任意静态服务器托管 `dist/`（如 `npx serve dist`、nginx、Caddy）
3. 同时运行 `node server/index.js`（或 pm2 / systemd 托管），保持 `/api/*` 与静态站点同源或可跨域访问
4. 若用 nginx，把 `/api` 反代到本服务即可：
   ```nginx
   location /api/ {
     proxy_pass http://127.0.0.1:3210;
   }
   ```

## Giscus 评论配置步骤

评论使用 Giscus（基于 GitHub Discussions），配置在 `src/giscusConfig.js`：

1. 把站点发布到**公开 GitHub 仓库**（`git init` → push → 公开）
2. 在仓库 Settings 中开启 **Discussions**
3. 安装 [giscus app](https://github.com/apps/giscus) 到该仓库
4. 访问 [https://giscus.app/](https://giscus.app/)，按站点域名生成 `repo / repoId / category / categoryId`
5. 填入 `src/giscusConfig.js` 后重新构建部署

配置留空期间，站点评论区域会显示提示文案，不影响其他功能。
