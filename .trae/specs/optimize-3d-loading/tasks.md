# Tasks

- [x] Task 1: 空闲预取（src/preload.js + App 接入）
  - [x] SubTask 1.1: 新建 `src/preload.js`：`window.load` 后 `requestIdleCallback` 依次预取 `ProjectsNetwork` / `Lanyard` 的 JS chunk（动态 import 预热模块缓存），并 fetch 预热 `card.glb` 与 `lanyard.png`；降级：无 `requestIdleCallback` 时用 `setTimeout` 兜底
  - [x] SubTask 1.2: `App.jsx` 引入并触发预取（仅一次）
- [x] Task 2: ProjectsNetwork 可视才挂载 + rAF 错峰
  - [x] SubTask 2.1: `ProjectsNetwork.jsx` 内用 `IntersectionObserver`（root 为 `.content-area`）观察容器，进入视口才挂载 `<Canvas>`；挂载前渲染同尺寸占位（复用 `.network-3d` 尺寸）
  - [x] SubTask 2.2: 可见后延迟一帧（`requestAnimationFrame`）再真正渲染 Canvas，避免与页面首帧同帧初始化
- [x] Task 3: Lanyard 错峰 + dpr 降负
  - [x] SubTask 3.1: `Lanyard.jsx` Canvas 挂载延迟一帧（rAF），初始显示占位
  - [x] SubTask 3.2: `dpr={[1, 2]}` 改为 `dpr={[1, 1.5]}`
- [x] Task 4: 构建与回归验证
  - [x] SubTask 4.1: `npm run build` 通过
  - [x] SubTask 4.2: 验证：切 projects/about 首帧无长任务卡顿；星图/吊牌可视时正常出现；预取后二次进入无等待；拖拽/交互/动效无回归（回归中发现的预取竞态已修复：`readyState==='complete'` 立即预取兜底）

# Task Dependencies
- [Task 4] 依赖 [Task 1]、[Task 2]、[Task 3]
