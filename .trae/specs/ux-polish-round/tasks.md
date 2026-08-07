# Tasks

- [x] Task 1: posts 单篇重复点击 posts 返回列表
  - [x] SubTask 1.1: `App.jsx` 新增 `navTick`，`handleNavigate` 中点击当前 tab（无 id）时自增；向 `ContentArea` 传 `resetSignal={navTick}`，`ContentArea` 透传给 `BlogSection`
  - [x] SubTask 1.2: `BlogSection.jsx` 接收 `resetSignal`，`useEffect([resetSignal])` 中 `setSelectedId(null)`（不影响 focusId 高亮逻辑）
- [x] Task 2: 返回顶部按钮位置与提示
  - [x] SubTask 2.1: `ContentArea.css` `.back-to-top` 位置改 `right:32px; bottom:96px`；窄屏 `right:20px; bottom:80px`
  - [x] SubTask 2.2: `BackToTop.jsx` 移除 tooltip span、`flash` state 与 `is-flash` 逻辑；`ContentArea.css` 删除 `.back-to-top-tip` 与 `.is-flash` 相关规则
- [x] Task 3: 背景流动诊断与修复
  - [x] SubTask 3.1: `Dither.jsx` `useFrame` 改为 `delta` 累加驱动 `u.time.value`（新增 timeRef），不再用 `clock.getElapsedTime()`
  - [x] SubTask 3.2: `App.jsx` Dither `waveSpeed` 由 `0.45` 提升至 `0.7`；不改动颜色/色阶/亮度/振幅参数（后续按用户反馈调至 `1.5` 再定稿 `0.8`）
  - [x] SubTask 3.3: `Dither.jsx` 加入运行时探针：前 120 帧内每隔 30 帧 `console.log` time 采样值，首帧打印 frameloop 状态与 `prefers-reduced-motion` 布尔值；交由用户提供控制台输出以二分定位
- [x] Task 4: 构建与验证
  - [x] SubTask 4.1: `npm run build` 通过
  - [x] SubTask 4.2: 根因确认：R3F v9 对 ShaderMaterial uniforms 按值拷贝，原始值（time）的运行时赋值到不了 shader；改为经 materialRef 直接改 material.uniforms 后背景正常流动

# Task Dependencies
- [Task 4] 依赖 [Task 1]、[Task 2]、[Task 3]
