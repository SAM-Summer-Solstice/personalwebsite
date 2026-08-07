# Tasks

- [x] Task 1: 重型组件按需加载（代码分割）
  - [x] SubTask 1.1: `ContentArea.jsx` 用 `React.lazy` + `Suspense` 包裹 `AboutSection`、`ProjectsSection`（间接承载 Lanyard / ProjectsNetwork 的重依赖）；fallback 使用与页面一致的轻量占位
  - [x] SubTask 1.2: `BlogSection.jsx` 内 `Giscus` 改为 `React.lazy`，仅单篇视图渲染时挂载
  - [x] SubTask 1.3: 核对 `vite.config.js` 产物分包；必要时配置 chunk 命名以便观察分包体积
- [x] Task 2: 滚动监听节流（BackToTop）
  - [x] SubTask 2.1: `BackToTop.jsx` scroll 回调改为 rAF 合并更新（progress/visible 每帧最多一次），清理时取消 rAF
- [x] Task 3: 动态背景计算量约束（Dither）
  - [x] SubTask 3.1: `Dither.jsx` 中 pixelSize 波动由 `2 ± 35%` 调整为 `2 ~ 3`（下限不低于 2）
  - [x] SubTask 3.2: 确认 dpr=1 与 frameloop 配置不变，观感保持颗粒呼吸
- [x] Task 4: 构建与回归验证
  - [x] SubTask 4.1: `npm run build` 通过，比较分包前后体积（主包从 3613KB 降至 1305KB，gzip 1238→382KB；Lanyard/GLB/Giscus/ProjectsNetwork 独立分包）
  - [x] SubTask 4.2: 浏览器运行无错误；懒加载仅在对应页面触发；滚动、GSAP 动效、背景波动代码路径无回归

# Task Dependencies
- [Task 4] 依赖 [Task 1]、[Task 2]、[Task 3]
