# Tasks

- [x] Task 1: 新增 BackToTop 组件
  - [x] SubTask 1.1: `src/components/BackToTop.jsx`：`position: fixed` 右下圆钮，监听 `.content-area` scroll（passive）计算进度与显隐（阈值 480px）
  - [x] SubTask 1.2: SVG 阅读进度环（accent 细线，stroke-dashoffset 随进度更新）+ 中心 `↑`（mono）
  - [x] SubTask 1.3: 点击平滑滚回顶部（`prefers-reduced-motion` 时瞬间）；点击瞬间短暂显示 `cd ~` 反馈
  - [x] SubTask 1.4: hover/focus 上浮 + `cd ~` tooltip；`aria-label="返回页面顶部"`
- [x] Task 2: 挂载与样式
  - [x] SubTask 2.1: `ContentArea.jsx` 挂载 `<BackToTop />`
  - [x] SubTask 2.2: `ContentArea.css` 新增按钮/进度环/tooltip/显隐淡入淡出动画；≤768px 缩小按钮、隐藏 tooltip
- [x] Task 3: 构建与验证
  - [x] SubTask 3.1: `npm run build` 通过
  - [x] SubTask 3.2: dev 验证要点：组件挂载于四页通用、scroll 监听计算进度与显隐、点击回顶与 cd ~ 反馈、reduced-motion 分支、窄屏 40px 适配

# Task Dependencies
- [Task 2] 依赖 [Task 1]
- [Task 3] 依赖 [Task 1]、[Task 2]
