# 动效实现细节修复（Fix Motion Jank）Spec

## Why
用户反馈"现在还是卡顿"，但 3D 加载优化后（资源预取、可视才挂载、错峰）加载侧已无长任务，因此判定卡顿来自**动效代码实现细节**而非加载/性能。逐一审查 `usePageMotion.js` 与各 Section 的动效挂载后，确认以下实现问题：

1. **首屏 Opening Animation 每次进入首页都会重播**（[HomeSection.jsx](src/components/sections/HomeSection.jsx) 的 `useLayoutEffect` → `playHomeOpening`）：完整版用全屏 `.mv-curtain`（fixed z-999 背景色）遮挡视口约 1.5s；轻量版仍重放 `home-name` 的 `yPercent:115 + clipPath + scaleY` 强进场 + 3 项 stagger。用户明确认为"不好看"，且切回首页必然重播，观感拖沓。
2. **切页瞬间所有动效元素被同步注入隐藏态**（[usePageMotion.js](src/motion/usePageMotion.js#L43-L105)）：所有 `gsap.from/fromTo` 未设 `immediateRender:false`，在 `initPageMotion`（`useLayoutEffect`）创建瞬间就把当前页的 `[data-reveal-title]`、`[data-stagger]` 前 6 项、`[data-reveal]`、`.md-figure img` **全部**设为隐藏态（clip 全遮 / opacity:0 / y 位移）。
3. **恢复滚动位置后批量动画同时触发**：`ContentArea` 先恢复 `scrollTop`，再创建 ScrollTrigger；`once:true` 导致**视口内及其上方**（已滚过触发点）的元素在切页后立刻全部同时播放（标题 clip-path 栅格化 + 卡片 opacity + 3D 初始化叠加）→ 切页首帧冲击。
4. **首屏内元素也做滚动动画**：projects 的 `projects-network-wrap`、about 的 `about-main` 首块、blog 的 `~/posts` 标题均在首屏内，`start 'top 85%~92%'` 使它们切页后立即触发 → 首屏总在播动画。
5. **懒加载图片逐个 `ScrollTrigger.refresh()`**（[usePageMotion.js](src/motion/usePageMotion.js#L107-L111)）：每张 `loading="lazy"` 图加载完就整体 refresh，长文多图在滚动途中反复 refresh → 触发位置跳动。
6. **about-main 大块 stagger**：整个 about 主区 6 个大型文本块整体做 opacity 动画，每块都是大合成层。

目标：移除首屏 opening，并让动效"只在滚动进入视口时播放、首屏与已滚过内容保持静态"，切页首帧只做布局渲染与 3D 初始化。

## What Changes
- **移除首屏 Opening Animation（全部）**：删除 `HomeSection.jsx` 的 `useLayoutEffect`/`playHomeOpening` 调用与 `.mv-curtain` DOM、`data-opening-name`/`data-opening-item` 属性；删除 `usePageMotion.js` 的 `playHomeOpening`/`isOpeningPlayed`/`markOpeningPlayed`；删除 `ContentArea.css` 的 `.mv-curtain`/`.has-js .mv-curtain`。首页 hero 直接静态呈现。
- **`initPageMotion` 增加"已在视口内/已滚过元素跳过动画"判断**：为每个动效元素创建 scrollTrigger 前，按 scroller（`.content-area`）视口判断 `getBoundingClientRect()` —— 元素顶部在视口内或上方（`top < scroller.clientHeight`）则**跳过动画保持静态可见**；只对滚动后才进入视口的下方元素创建 scrollTrigger 动画。彻底消除"切页后批量动画同时触发"与"首屏叠加动画"。
- **懒加载图片 refresh 去抖**：`img load → ScrollTrigger.refresh()` 改为短时去抖（批量合并），避免滚动途中反复 refresh 导致位置跳动。
- **保留**：滚动触发的模块标题强进场（clip 遮罩）、卡片 stagger、图片 reveal/视差能力不变，仅受上述跳过逻辑约束（首屏/已滚过不播）。
- **保留**：`index.html` 的 `has-js` fail-open 机制（其他动效仍依赖）。

## Impact
- Affected specs: `add-gsap-motion`（动效系统）、`perf-optimization-review`、`optimize-3d-loading`
- Affected code:
  - `src/motion/usePageMotion.js`（移除 opening 相关导出；`initPageMotion` 增加视口判断与 refresh 去抖）
  - `src/components/sections/HomeSection.jsx`（移除 opening 挂载与 curtain、opening 数据属性）
  - `src/components/ContentArea.css`（移除 `.mv-curtain` 样式）
  - `index.html`（不动，保留 `has-js`）

## ADDED Requirements

### Requirement: 首页无 Opening Animation
系统 SHALL 移除首页首屏揭幕动画，首页内容直接静态呈现。

#### Scenario: 首次加载站点
- **WHEN** 用户首次打开站点（home 页）
- **THEN** 无全屏遮罩、无标题强进场动画，hero 与下方内容直接可见、立即可滚动

#### Scenario: 从其他页切回 home
- **WHEN** 用户导航切回 home
- **THEN** 不再重播任何开场动画，内容立即呈现

### Requirement: 切页首帧不叠加动效
系统 SHALL 保证切换到任一页面时，首屏内元素与恢复滚动位置后已滚过的元素不播放滚动触发动画。

#### Scenario: 切到 projects / about / blog 页（首屏）
- **WHEN** 用户切换页面且首屏区域包含标题/星图容器/文本块
- **THEN** 首屏元素保持静态可见（3D 初始化独占首帧资源），无标题 clip 动画、无 stagger 动画同时播放

#### Scenario: 恢复较深的滚动位置
- **WHEN** 用户切回曾滚动到中下部的页面（scrollTop 被恢复）
- **THEN** 视口内及上方的元素不再触发动画（直接可见），仅视口下方未滚过的元素保留滚动触发动画

### Requirement: 懒加载图片不引发滚动跳动
系统 SHALL 合并图片加载引发的 ScrollTrigger 刷新。

#### Scenario: 长文多图滚动加载
- **WHEN** 正文图片在滚动途中陆续加载完成
- **THEN** ScrollTrigger 刷新被去抖合并，触发位置不因单张图加载而跳动

## MODIFIED Requirements

### Requirement: 滚动触发动效（保留能力）
模块标题强进场 / 卡片 stagger / 图片 reveal+视差 SHALL 继续存在，但仅作用于"滚动进入视口"的下方元素；首屏与已滚过元素保持静态。

## REMOVED Requirements

### Requirement: 首屏 Opening Animation
**Reason**: 用户认为不好看且每次切回首页重播；全屏遮罩遮挡 1.5s 造成"卡住"观感。
**Migration**: 直接删除相关代码与样式；首页无开场动画。
