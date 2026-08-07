# Tasks

- [ ] Task 1: 小球不透明化
  - [ ] SubTask 1.1: `ProjectsNetwork.jsx` 移除 `meshBasicMaterial` 的 `transparent` 与动态 opacity，节点始终实心
  - [ ] SubTask 1.2: 保留并调整按距离的 scale 深度 cue（近大远小），阈值微调保证远球不消失
- [ ] Task 2: 白字标签样式
  - [ ] SubTask 2.1: `ContentArea.css` `.network-tooltip` 移除 background/border/box-shadow，改为 `color: #fff` + 轻微 text-shadow
  - [ ] SubTask 2.2: 确认悬停 tooltip 与常显标签共用该样式，深色背景与浅色小球上均可读
- [ ] Task 3: 全部标签开关按钮
  - [ ] SubTask 3.1: `ProjectsSection.jsx` 新增 `showLabels` 状态；`section-desc` 旁渲染开关按钮（`标签` / `隐藏标签`）
  - [ ] SubTask 3.2: `ProjectsNetwork.jsx` 接收 `showLabels`；节点标签在 `showLabels || hovered` 时渲染
  - [ ] SubTask 3.3: `ContentArea.css` 新增开关按钮样式（mono 小字、克制、hover 变 accent），与页面风格统一
- [ ] Task 4: 构建与运行验证
  - [ ] SubTask 4.1: `npm run build` 通过
  - [ ] SubTask 4.2: dev server 验证：小球不透明且近大远小、悬停白字、开关常显/隐藏、暗色与窄屏协调

# Task Dependencies
- [Task 1] 无
- [Task 2] 无
- [Task 3] 依赖 [Task 2]（标签样式复用）
- [Task 4] 依赖 [Task 1]、[Task 2]、[Task 3]
