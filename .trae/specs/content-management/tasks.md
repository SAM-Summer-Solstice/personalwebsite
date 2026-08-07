# Tasks

- [x] Task 1: Markdown 内容管线
  - [x] SubTask 1.1: 新增依赖 `marked`；6 篇文章 / 6 个项目迁移为 `content/posts/*.md`、`content/projects/*.md`
  - [x] SubTask 1.2: `src/data/frontmatter.js` 轻量解析器（标量/简单数组/JSON 数组），缺必需字段抛明确错误
  - [x] SubTask 1.3: `posts.js` / `projects.js` 改为 `import.meta.glob` 加载层，导出结构与消费方兼容
  - [x] SubTask 1.4: node 冒烟校验通过（ALL OK：字段完整、related 有效、views 数字）
- [x] Task 2: Markdown 正文渲染与排版（uicraft 审美）
  - [x] SubTask 2.1: 新建 `MarkdownBody.jsx`（marked renderer 给 h2 加锚点 id + 收集 headings）
  - [x] SubTask 2.2: BlogSection 单篇视图改用 MarkdownBody；TOC 依据收集的 h2 渲染，平滑滚动 + reduced-motion 降级
  - [x] SubTask 2.3: `ContentArea.css` 新增 `.md-body` 排版（h2/段落/行内码/代码块/列表/引用/链接，Quiet Craft 暗色）
  - [x] SubTask 2.4: 窄屏与 `prefers-reduced-motion` 适配
- [x] Task 3: 真实浏览量（自建后端 + 前端接入）
  - [x] SubTask 3.1: `server/index.js` 零依赖 Node http：GET/POST `/api/views/:id`，JSON 原子写持久化
  - [x] SubTask 3.2: `package.json` 增加 `npm run server`；`vite.config.js` dev 代理 `/api` → 3210
  - [x] SubTask 3.3: `src/api.js`（getViews / incrementViews，失败返回 null）
  - [x] SubTask 3.4: PostMeta 异步拉取真实浏览量（失败降级 mock）；单篇挂载 sessionStorage 会话去重 +1
  - [x] SubTask 3.5: 浏览量展示/降级样式
- [x] Task 4: Giscus 评论集成
  - [x] SubTask 4.1: 新增依赖 `@giscus/react`；`src/giscusConfig.js` 占位配置
  - [x] SubTask 4.2: 单篇视图底部 `.blog-comments-area` 渲染 Giscus（配置就绪时）或提示文案（占位时）
  - [x] SubTask 4.3: 移除列表页 mock 评论展开，`评论 N` 改为进入单篇视图入口
  - [x] SubTask 4.4: `server/README.md` 说明 Giscus 配置步骤与部署方式
- [x] Task 5: 构建与运行验证
  - [x] SubTask 5.1: `npm run build` 通过（613 modules，giscus 独立 chunk）
  - [x] SubTask 5.2: dev server 验证：`npm run server` 启动、API 计数/持久化 curl 测试通过、浏览器无报错

# Task Dependencies
- [Task 1] 无（内容管线先行）
- [Task 2] 依赖 [Task 1]
- [Task 3] 依赖 [Task 1]
- [Task 4] 依赖 [Task 1]
- [Task 5] 依赖 [Task 2]、[Task 3]、[Task 4]
