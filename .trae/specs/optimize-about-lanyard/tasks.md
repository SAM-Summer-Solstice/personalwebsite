# Tasks

- [x] Task 1: Lanyard 挂载错峰
  - [x] SubTask 1.1: `Lanyard.jsx` 挂载时机从"rAF 一帧"改为"rAF 一帧 → `requestIdleCallback`（timeout 800ms 兜底，无 rIC 用短延迟）"，GLB / rapier / Environment 在空闲时初始化；挂载后直接显示（不加淡入）
- [x] Task 2: 补齐联系方式 / 博客初衷动效
  - [x] SubTask 2.1: `usePageMotion.js` 的 `[data-stagger]` 条目上限支持容器级覆盖 `data-stagger-limit`（默认 `STAGGER_LIMIT=6`）
  - [x] SubTask 2.2: `AboutSection.jsx` 的 `about-main` 加 `data-stagger-limit="8"`，8 个直接子块全部参与 stagger 入场
- [x] Task 3: 构建与回归验证
  - [x] SubTask 3.1: `npm run build` 通过
  - [x] SubTask 3.2: 浏览器回归：切 about 首帧无 WebGL 初始化长任务叠加（rIC 空闲挂载）；吊牌正常出现、拖拽/物理无回归；about 页联系方式、博客初衷随滚动入场；其他页面 stagger 行为不变（仍受 STAGGER_LIMIT=6 约束）；控制台无错误（5/5 通过：canvas 挂载晚于入场动画开始 619ms、WebGL 长任务距动画 777ms；联系方式/博客初衷第 7/8 块动画 0→1 完整；blog-list 第 7 卡无动画初始态 limit 截断正确）

# Task Dependencies
- [Task 3] 依赖 [Task 1]、[Task 2]
- [Task 2] 独立于 [Task 1]（不同文件，可并行）
