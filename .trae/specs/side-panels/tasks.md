# Tasks

- [x] Task 1: 帖子单篇页星点 TOC 侧栏
  - [x] SubTask 1.1: `BlogSection.jsx` 移除顶部 `.blog-toc` 块，改为右侧星点 TOC（✦ + 竖线，默认隐文字，hover/focus-visible 显示文字，点击滚动到小节）
  - [x] SubTask 1.2: 新增 scrollspy：IntersectionObserver（root 为 .content-area，rootMargin -15%/-70%）监听小节，当前可见小节星星高亮 accent
  - [x] SubTask 1.3: `ContentArea.css` `.blog-single` 改 grid 双栏（正文 + sticky TOC 220px），星点 TOC 样式（发丝竖线、星星对齐、文字淡入），移除旧 `.blog-toc` 样式
- [x] Task 2: projects 主页项目概览侧栏
  - [x] SubTask 2.1: `ProjectsSection.jsx` 外包 `.projects-page` grid（左 `.projects-main`：section-head + 星图 + 列表；右 `.projects-overview`）
  - [x] SubTask 2.2: 概览侧栏：`~/projects` 头、状态统计（done/doing/planning 三色）、技术栈聚合（去重前 8）、最近在做什么（最新项目名 + tagline）
  - [x] SubTask 2.3: `ContentArea.css` 概览侧栏样式（mono 小字、发丝线分隔、无卡片、sticky）
- [x] Task 3: 响应式回退与验证
  - [x] SubTask 3.1: ≤1024px 隐藏两个侧栏，回退单列；评论区保持底部全宽
  - [x] SubTask 3.2: `npm run build` 通过
  - [x] SubTask 3.3: dev 验证要点确认：双栏结构、星点 TOC hover/高亮逻辑、概览数据计算、窄屏断点均已在代码层验证（`blog-single > .blog-post-meta` 选择器同步改为 `.blog-single-main > .blog-post-meta`，旧 `.blog-toc` 无残留）

# Task Dependencies
- [Task 3] 依赖 [Task 1]、[Task 2]
