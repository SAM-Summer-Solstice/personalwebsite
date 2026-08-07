# Tasks

- [x] Task 1: 移除首屏 Opening Animation
  - [x] SubTask 1.1: `HomeSection.jsx` 删除 `useLayoutEffect` 的 opening 播放、`.mv-curtain` DOM、`data-opening-name` / `data-opening-item` 属性（hero 直接静态呈现）
  - [x] SubTask 1.2: `usePageMotion.js` 删除 `playHomeOpening` / `isOpeningPlayed` / `markOpeningPlayed` 及相关模块级标志
  - [x] SubTask 1.3: `ContentArea.css` 删除 `.mv-curtain` / `.has-js .mv-curtain` 样式；grep 确认无残留引用（含 `data-opening`）
- [x] Task 2: 消除切页首帧动效叠加
  - [x] SubTask 2.1: `initPageMotion` 增加视口判断：为每个动效元素创建 scrollTrigger 前，用 `getBoundingClientRect()` 相对 scroller（`.content-area`）判断，元素顶部在视口内或上方（`top < scroller.clientHeight`）则跳过动画（保持静态可见）
  - [x] SubTask 2.2: 覆盖全部 4 类动效（`data-reveal-title` / `data-stagger` / `data-reveal` / `.md-figure`），首屏与已滚过元素统一走跳过逻辑；滚动进入视口的下方元素照常创建动画
- [x] Task 3: 懒加载图片 refresh 去抖
  - [x] SubTask 3.1: `img load → ScrollTrigger.refresh()` 改为短时去抖（如 120ms 合并），避免滚动途中反复 refresh
- [x] Task 4: 构建与回归验证
  - [x] SubTask 4.1: `npm run build` 通过
  - [x] SubTask 4.2: 浏览器回归：首页无 opening（无遮罩/无强进场）；切 projects/about/blog 首屏无叠加动画、无长任务；恢复滚动位置后已滚过元素不批量触发动画；滚动触发标题/卡片/图片动画正常无闪烁；星图/吊牌/拖拽/GSAP 无回归（回归发现 bug 见 Task 5）
- [x] Task 5: 修复 `[data-stagger]` 容器级跳过误伤
  - [x] SubTask 5.1: `[data-stagger]` 的跳过判断从容器级改为**子项级**：对每个直接子元素逐个 `isPastViewportTop` 判断，首屏内/已滚过的子项跳过（静态可见），仅视口下方的子项参与 stagger 动画；`STAGGER_LIMIT` 作用于未跳过的子项；scrollTrigger trigger 用第一个未跳过的子项
  - [x] SubTask 5.2: 重新构建 + 浏览器复验：blog 列表首屏可见卡片无动画、视口下方卡片滚动进入时仍有 stagger 动画（D1/F1/C3 全部复验通过：卡片 4/5 滚动入场带动画、恢复滚动位置后视口内静态可见且下方未滚过卡片保留动画、控制台无错误）

# Task Dependencies
- [Task 4] 依赖 [Task 1]、[Task 2]、[Task 3]
- [Task 2] 依赖 [Task 1]（同一文件 `usePageMotion.js`，避免合并冲突）
- [Task 5] 依赖 [Task 2]（修正 `initPageMotion` 中 `[data-stagger]` 的跳过逻辑）
