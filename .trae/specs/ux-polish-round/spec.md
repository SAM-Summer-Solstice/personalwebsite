# UX 细节打磨（UX Polish Round）Spec

## Why
四项体验问题：① 在 posts 单篇视图再次点击导航栏 posts 按钮无法返回列表页；② 返回顶部按钮固定在右下角 24px，与底部收起的终端（高 40px）重叠影响观感；③ 返回顶部按钮 hover/点击会出现 `cd ~` 提示，用户不想要；④ Dither 背景波浪一直看不出在流动。

**背景流动已查证的结论（不猜测）**：
- R3F（@react-three/fiber）源码中无 `prefers-reduced-motion` / `matchMedia` 处理，Canvas 渲染循环不受系统动画抑制控制
- 项目内 reduced-motion 只出现在 BackToTop.jsx / BlogSection.jsx 的 JS 判断与两处 CSS 动画抑制块，均不作用于 Dither 的 canvas
- Dither.jsx 动画逻辑完整（`frameloop="always"` + useFrame 每帧更新 time uniform），CSS 无法阻止 canvas 渲染
- 因此需通过**运行时探针**二分定位：动画时间是否递增（循环正常）？若是，则问题在视觉对比度（流动太慢/太暗感知不到）；若否，则是渲染循环被环境冻结

## What Changes
- **posts 重复点击返回列表**：`App` 新增 `navTick`；点击导航且 tab 为当前 tab（无 focusId）时自增，传给 `BlogSection` 作为 `resetSignal`，触发时清空单篇 `selectedId` 回到列表
- **返回顶部按钮上移**：`.back-to-top` 由 `right:24px; bottom:24px` 改为 `right:32px; bottom:96px`（窄屏 `right:20px; bottom:80px`），高于收起终端（40px）不再重叠
- **移除 `cd ~` 提示**：`BackToTop` 移除 tooltip span 与点击闪现（is-flash），仅保留进度环 + ↑；CSS 删除 `.back-to-top-tip` / `.is-flash` 规则
- **背景流动诊断与修复**（Task 3）：
  - 无风险改造：`Dither.jsx` 动画时间改为 `useFrame` 的 `delta` 累加自增（不依赖 `clock.getElapsedTime()`），消除时钟不确定性；`waveSpeed` 0.45 → 0.7 提升流动可见度；**不改动** waveColor / colorNum / bias / 亮度 / 振幅
  - 运行时探针：`useFrame` 中打印前若干帧的 time 值 + `prefers-reduced-motion` 状态，请用户提供浏览器控制台输出，据此二分定位（时间走→视觉问题；时间不走→循环冻结）

## Impact
- Affected specs: `add-back-to-top`（按钮位置与彩蛋）、`create-hybrid-terminal-blog`（终端/背景）、`differentiate-content-pages`（posts 单篇导航）
- Affected code:
  - `src/App.jsx`（navTick、向 BlogSection 传 resetSignal、Dither waveSpeed）
  - `src/components/sections/BlogSection.jsx`（接收 resetSignal，清空 selectedId）
  - `src/components/BackToTop.jsx`（移除 tooltip 与 flash）
  - `src/components/ContentArea.css`（back-to-top 位置、删除 tip 样式）
  - `src/components/Dither.jsx`（delta 累加时间 + 运行时探针）

## ADDED Requirements

### Requirement: posts 导航重置
系统 SHALL 让用户在 posts 单篇视图重复点击导航栏 posts 时返回列表页。

#### Scenario: 单篇返回列表
- **WHEN** 用户处于某篇帖子单篇视图，点击导航栏 `posts`
- **THEN** 回到 posts 列表页（清空单篇选中状态）

#### Scenario: 普通导航不受影响
- **WHEN** 用户从其他页面进入 posts
- **THEN** 正常显示列表页，行为不变

### Requirement: 背景波浪诊断
系统 SHALL 通过运行时探针确认 Dither 动画时间是否递增，以定位"看不到流动"的根因。

#### Scenario: 探针输出
- **WHEN** 页面加载后打开浏览器控制台
- **THEN** 打印 Dither 渲染循环状态（是否运行、reduced-motion 状态、time 采样值），据此判断是渲染循环冻结还是视觉对比度问题

## MODIFIED Requirements

### Requirement: 返回顶部按钮位置
`.back-to-top` 位置上移至收起终端之上，不再与终端重叠。

### Requirement: 返回顶部按钮提示
移除 `cd ~` tooltip（hover 与点击闪现），按钮仅保留进度环与 ↑。

### Requirement: Dither 动画时间源
`Dither.jsx` 时间驱动由 `clock.getElapsedTime()` 改为 `useFrame` delta 自增累加；并临时加入运行时探针供诊断。

## REMOVED Requirements

### Requirement: `cd ~` 彩蛋提示
**Reason**: 用户不想要返回顶部按钮上的 `cd ~` 文字。
**Migration**: 直接移除 tooltip 与点击闪现逻辑；`cd` 命令行为保持不变。
