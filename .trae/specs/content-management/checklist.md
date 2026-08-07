# Checklist

- [x] `content/posts/*.md` 与 `content/projects/*.md` 已建立，现有 mock 内容全部迁移
- [x] frontmatter 解析正确，缺必需字段时构建抛明确错误
- [x] posts.js / projects.js 改为加载层，导出结构与现有消费方兼容
- [x] 数据冒烟校验通过（字段完整、related 有效）
- [x] 单篇视图用 Markdown 渲染正文，`.md-body` 排版符合暗色 Quiet Craft 风格
- [x] TOC 从渲染 DOM 提取 h2 并可平滑跳转（reduced-motion 降级）
- [x] `server/` 零依赖后端可启动，GET/POST `/api/views/:id` 正常、JSON 持久化、重启数据不丢
- [x] 前端接入浏览量 API：单篇会话去重 +1、列表展示真实值、API 失败降级 mock 不报错
- [x] `vite.config.js` dev 代理 `/api` 联调正常
- [x] Giscus 已集成到单篇视图；配置占位时显示提示文案而非损坏 iframe
- [x] 列表页 mock 评论展开已移除，评论入口收敛到单篇视图
- [x] 既有功能保留：筛选/搜索/单篇/TOC/点赞、projects 外链/时间线/知识网络、home 预览
- [x] 窄屏与 `prefers-reduced-motion` 不破版
- [x] `npm run build` 通过
