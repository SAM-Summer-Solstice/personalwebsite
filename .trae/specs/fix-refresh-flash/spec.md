# 修复刷新时内容闪现（Fix Refresh Flash）Spec

## Why
用户反馈：所有页面刷新时，内容会**先出现一次 → 消失 → 再以动效出现**。这是一个视觉闪烁（FOUC 变体），根因在动效初始化时序：

1. HTML 加载 → `index.html` 内联脚本给 `<html>` 加 `has-js` 类（用于 fail-open，但**当前无任何 CSS 规则使用 `.has-js`**，该类是空操作）
2. React 挂载 → ContentArea 渲染 → 各 Section 渲染内容，此时内容**可见**（CSS 无预隐藏）
3. 异步数据返回 → `useContent.js` 的 `notifyContentReady()` 广播 `app:content-ready`
4. ContentArea 监听器收到事件 → **防抖 120ms** → `setMotionEpoch(e => e + 1)`
5. `useLayoutEffect` 触发 `initPageMotion()` → `gsap.from()` 默认 `immediateRender:true` 注入 `opacity:0 / y:30` → 内容**隐藏**
6. ScrollTrigger `once:true` + `start:'top 88%~92%'` → 元素已在视口 → 动画播放 → 内容**再次可见**

闪烁发生在步骤 2-4（内容可见约 120ms+fetch 时长）与步骤 5→6（隐藏→动画再现）。`has-js` fail-open 机制原意是在 CSS 层预隐藏动效元素，但对应 CSS 规则缺失，导致隐藏动作完全依赖 JS 运行时（gsap.from immediateRender），而 motionEpoch 的"等数据就绪"延迟使隐藏晚于首帧绘制。

### 附：Bug 1（posts 卡片点击不进单篇）
用户反馈"posts 列表内点击卡片没有进入单篇，而是停留在 posts 页面"，后确认"第一个问题现在没有了，可能不太稳定"。代码审查（[BlogSection.jsx:348](src/components/sections/BlogSection.jsx#L348) `onOpen={(id) => navigate(\`/posts/${id}\`)}` + [BlogSection.jsx:237](src/components/sections/BlogSection.jsx#L237) `const navigate = useNavigate()`）确认逻辑正确，`App.jsx` 路由 `/posts/:postId` 也存在。判断为**陈旧 dist 构建或浏览器缓存**导致的瞬时问题，本 spec 不做代码改动，仅记录监控。

## What Changes
- **`src/components/ContentArea.jsx`**：在挂载时（`useLayoutEffect` 首次运行，早于浏览器绘制）立即用 `gsap.set` 将当前页的动效元素（`[data-reveal-title]`、`[data-reveal]`、`[data-stagger]` 直接子项、`.md-figure img`）置为隐藏初始态（opacity:0 + 对应 y/clipPath/scale），**不再等待 motionEpoch**。这样隐藏发生在首帧绘制前，消除"先出现一次"。
  - 保留 motionEpoch 机制用于**创建动画与 ScrollTrigger**（仍需等数据就绪，避免 stagger 子项缺失）
  - 即：隐藏态由"gsap.from immediateRender 在 motionEpoch 触发时注入"改为"gsap.set 在挂载时立即注入"
  - `initPageMotion` 内的 `gsap.from` 改为 `gsap.fromTo`（显式 from，避免重复依赖 immediateRender；已隐藏的元素 fromTo 的 from 与当前内联态一致，无跳变）
- **`src/motion/usePageMotion.js`**：导出 `hideMotionElements(scope)` 供 ContentArea 挂载时调用；`initPageMotion` 内部移除对 immediateRender 的隐式依赖（from → fromTo），保持 ScrollTrigger 触发逻辑不变
- **不动 `index.html`**：`has-js` 保留（空操作无害；若未来要加 CSS 预隐藏可复用）
- **不动后端/路由/视觉设计**

## Impact
- Affected specs: `fix-motion-jank`（动效时序细化）、`add-gsap-motion`（动效系统）
- Affected code:
  - `src/components/ContentArea.jsx`（新增挂载时 gsap.set 隐藏；motionEpoch 仅触发动画创建）
  - `src/motion/usePageMotion.js`（导出 hideMotionElements；from → fromTo）
- 不影响：路由、数据层、后端、3D 组件、视觉观感

## ADDED Requirements

### Requirement: 刷新时内容不闪现
系统 SHALL 在页面刷新（硬刷新 / F5 / 直接访问 URL）时，内容在首帧绘制前即处于动效初始隐藏态，不出现"先可见再消失再动画出现"的闪烁。

#### Scenario: 刷新任一页面
- **WHEN** 用户刷新浏览器（或直接访问 `/`、`/posts`、`/posts/:id`、`/projects`、`/about`）
- **THEN** 内容区不出现"先出现一次再消失"的闪烁；动效元素直接从隐藏态平滑动画进入（或滚动到视口时进入），观感连贯

#### Scenario: 异步数据加载期间
- **WHEN** 页面数据（posts/projects/about）尚未返回，内容区显示"加载中…"或骨架
- **THEN** 加载态本身不闪烁；数据到达后渲染的卡片等动效元素同样从隐藏态进入（gsap.set 在数据渲染后的 useLayoutEffect 中补隐藏，再由 motionEpoch 触发动画）

### Requirement: 动效能力与观感无回归
系统 SHALL 保留现有动效能力（标题 clip 揭开、卡片 stagger、单元素 reveal、图片 reveal+视差）与触发逻辑（首屏内/已滚过跳过、滚动到视口触发、once:true）。

#### Scenario: 滚动触发动效
- **WHEN** 用户滚动页面，动效元素进入视口
- **THEN** 播放进场动画（与当前行为一致），不因隐藏态前置而漏播或跳变

#### Scenario: 切页不重播
- **WHEN** 用户在 tabs 间切换
- **THEN** 已播放过的 once 动画不重播；首屏内/已滚过元素保持静态可见（当前 shouldSkip 逻辑不变）

### Requirement: fail-open 契约保留
系统 SHALL 保证 JS 完全不可用时内容仍可见。

#### Scenario: JS 失败
- **WHEN** 浏览器禁用 JS 或模块加载失败
- **THEN** 内容可见（gsap.set 未执行，CSS 无预隐藏，内容保持默认可见态）

## MODIFIED Requirements

### Requirement: 动效初始化时序
动效初始化 SHALL 分两阶段：挂载时（useLayoutEffect）立即隐藏动效元素；数据就绪后（motionEpoch）创建 ScrollTrigger 动画。不再依赖 gsap.from immediateRender 在 motionEpoch 触发时注入隐藏态。

## REMOVED Requirements
无
