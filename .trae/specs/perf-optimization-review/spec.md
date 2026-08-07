# 性能审查与优化（Perf Optimization）Spec

## Why
对站点做系统性能审查，重点：响应卡顿、动态背景、滚动监听、GSAP 动画、首屏加载、React Bits 衍生背景动画。审查基于代码事实，发现三个明确问题并直接优化。

**已查证的问题（非猜测）**：
1. **首屏加载 / bundle 过大**：`ContentArea.jsx` 静态 import 全部页面 → 主 JS bundle 约 3.7MB（gzip 1.28MB）。Lanyard（`@react-three/drei` + `@react-three/rapier` + `meshline` + **2.4MB card.glb**）、Giscus、ProjectsNetwork（drei TrackballControls）全部随首屏加载，但分别只用于 about / blog 单篇 / projects 页。Dither 依赖的 `@react-three/fiber` + `three` 是首屏必需，不可拆。
2. **滚动监听**：`BackToTop.jsx` 的 scroll 监听未节流，每次滚动事件都 `setState`（progress + visible），高滚动频率下造成多余 React 渲染。
3. **动态背景（Dither / React Bits 衍生）**：`usePageMotion` 中 pixelSize 波动幅度 ±35%，基准 2 时下限到 1.3，全屏 shader 采样数 = (w/pixelSize)×(h/pixelSize)，计算量最高放大约 2.4 倍；dpr=1 已是省算力基线，但波动下限应约束在 ≥2。
4. GSAP：已使用 `once:true` + 单 ScrollTrigger stagger + transform/opacity/clip-path，滚动触发合理；ScrollTrigger `scrub` 视差仅作用于少量图片。无结构性问题，保持现状并验证。
5. 滚动容器 `.content-area` 的监听均为 passive，无 layout thrash 源；内容切换时 `gsap.context.revert()` 已清理动画。

## What Changes
- **代码分割（按页面懒加载重型组件）**：
  - `AboutSection` 中的 `Lanyard`（rapier/drei/meshline + GLB）→ `React.lazy`，仅进入 about 页时加载，配 Suspense fallback
  - `BlogSection` 中的 `Giscus` → `React.lazy`，仅单篇视图渲染时加载
  - `ProjectsNetwork`（drei TrackballControls）→ `React.lazy`，仅 projects 页加载（Dither 仍留在主包，首屏必需）
- **BackToTop 滚动节流**：scroll 回调改为 requestAnimationFrame 合并，避免每事件 setState
- **Dither 波动下限约束**：pixelSize 波动范围由 `2 ± 35%`（1.3~2.7）调整为 `2 ~ 3`（只增不减，避免计算量翻倍），观感保持"颗粒呼吸"
- **验证**：构建产物分包大小对比、页面切换与滚动流畅度无回归

## Impact
- Affected specs: `add-gsap-motion`（动效初始化）、`create-hybrid-terminal-blog`（背景/结构）、`add-lanyard-to-about`、`content-management`（giscus）
- Affected code:
  - `src/components/ContentArea.jsx`（React.lazy 拆分页面组件 + Suspense）
  - `src/components/sections/BlogSection.jsx`（Giscus lazy）
  - `src/components/sections/ProjectsSection.jsx`（ProjectsNetwork lazy）
  - `src/components/sections/AboutSection.jsx`（Lanyard lazy）
  - `src/components/BackToTop.jsx`（rAF 节流）
  - `src/motion/usePageMotion.js`（pixelSize 波动范围）
  - `vite.config.js`（如需命名 chunk / manualChunks）

## ADDED Requirements

### Requirement: 重型组件按需加载
系统 SHALL 仅在实际使用页面加载重型第三方依赖（rapier、drei、GLB、Giscus），首屏主包不包含它们。

#### Scenario: 首页 / posts / projects 首屏
- **WHEN** 用户首次打开站点（home）或访问 posts / projects 页
- **THEN** 不加载 Lanyard/rapier/GLB/Giscus 相关代码；主 JS bundle 显著减小，首屏加载加快

#### Scenario: 进入 about 页
- **WHEN** 用户切换到 about 页
- **THEN** 按需加载 Lanyard（含 GLB），加载期间显示与页面风格一致的占位（不白屏、不布局跳动）

### Requirement: 滚动监听节流
系统 SHALL 对返回顶部按钮的滚动更新做 rAF 合并，避免滚动事件直接触发 React 渲染。

#### Scenario: 快速滚动页面
- **WHEN** 用户快速滚动
- **THEN** 返回顶部按钮的进度环与显隐每帧最多更新一次，无多余渲染

### Requirement: 背景计算量约束
系统 SHALL 保持 Dither 全屏 shader 采样数不因随机波动而倍增。

#### Scenario: 背景波动运行
- **WHEN** 背景的颗粒度随机波动
- **THEN** pixelSize 恒在 2~3 之间（采样数 ≤ 原始值），视觉呼吸感保留，计算开销不增长

## MODIFIED Requirements

### Requirement: GSAP 动效保持现状
不调整 GSAP 动效结构与触发方式（once + 单 trigger stagger + scrub 少量图片），验证其在懒加载下仍正常（切换页面动画初始化、无残留）。

## REMOVED Requirements
无
