# About 页优化（Optimize About Page）Spec

## Why
用户反馈：posts 页一直流畅；projects 页在「rIC 空闲挂载」优化后已不卡；**about 页仍卡**，且**联系方式和博客初衷两个区块没有入场动效**。

根因（基于代码事实）：

1. **Lanyard 挂载未与页面动画错峰**（[Lanyard.jsx](src/components/Lanyard.jsx)）：`mounted` 仅延迟 rAF 一帧就创建 Canvas，切 about 页时 GLB 解析 + rapier 初始化 + `<Environment>` PMREM 生成与页面入场动画叠加 → 切页瞬间长任务。projects 星图正是用「rAF → `requestIdleCallback` 空闲挂载」解决了同一问题，本 spec 将同一模式应用到 Lanyard。
2. **联系方式 / 博客初衷无动效**（[AboutSection.jsx](src/components/sections/AboutSection.jsx)）：`about-main` 标记 `data-stagger`，但 [usePageMotion.js](src/motion/usePageMotion.js) 的 `STAGGER_LIMIT = 6` 只动画容器前 6 个直接子元素；`about-main` 有 8 个直接子块（header、about-header、个人介绍、学习方向、兴趣爱好、一些数据、**联系方式、博客初衷**），后两个超出限制 → 永远无入场动效。

按用户反馈明确：**不**做吊牌淡入，**不**做滚出视口暂停渲染（持续渲染开销可接受）；仅修挂载时机 + 补齐缺失动效。

## What Changes
- **Lanyard 挂载错峰**（[Lanyard.jsx](src/components/Lanyard.jsx)）：`mounted` 挂载从"rAF 一帧"改为"rAF 一帧 → `requestIdleCallback`（`timeout: 800` 兜底，无 rIC 用短延迟）"，GLB / rapier / Environment 初始化在浏览器空闲时进行，避开切页入场动画帧。挂载后直接显示，不加淡入。
- **补齐联系方式 / 博客初衷动效**：
  - [usePageMotion.js](src/motion/usePageMotion.js)：`[data-stagger]` 的条目上限改为支持容器级覆盖 `data-stagger-limit`（默认仍 `STAGGER_LIMIT=6`，其余容器不受影响）
  - [AboutSection.jsx](src/components/sections/AboutSection.jsx)：`about-main` 加 `data-stagger-limit="8"`，让 8 个直接子块全部参与 stagger 入场
- **保持**：Lanyard dpr `[1, 1.5]`、`<Environment>` 反射、物理 timeStep、绳子分段、拖拽交互全部不变；其他页面的 `STAGGER_LIMIT=6` 克制化不变。

## Impact
- Affected specs: `optimize-3d-loading`（rIC 挂载模式）、`add-lanyard-to-about`（Lanyard 视觉）、`fix-motion-jank`（stagger 逻辑）、`add-gsap-motion`
- Affected code:
  - `src/components/Lanyard.jsx`（挂载时机 → rIC 空闲挂载）
  - `src/motion/usePageMotion.js`（`[data-stagger]` 支持 `data-stagger-limit` 覆盖）
  - `src/components/sections/AboutSection.jsx`（`about-main` 加 `data-stagger-limit="8"`）

## ADDED Requirements

### Requirement: Lanyard 初始化与页面动画错峰
系统 SHALL 在浏览器空闲时挂载 Lanyard 的 WebGL 场景，避开切页入场动画帧。

#### Scenario: 切到 about 页（首次进入）
- **WHEN** 用户切换/进入 about 页
- **THEN** 页面文本布局与入场动画先执行；Lanyard 的 GLB / rapier / Environment 初始化在 `requestIdleCallback` 空闲时段进行（超时 800ms 兜底），切页首帧不出现 WebGL 初始化长任务

### Requirement: 联系方式与博客初衷入场动效
系统 SHALL 让 about 页全部内容块（含联系方式、博客初衷）参与 stagger 入场。

#### Scenario: 进入 about 页 / 滚动到联系方式与博客初衷
- **WHEN** 用户进入 about 页并滚动到页面下部
- **THEN** 联系方式、博客初衷两个区块随滚动依次入场（y 位移 + 淡入），与其余内容块动效一致

## MODIFIED Requirements

### Requirement: Lanyard 视觉与交互保持
吊牌渲染参数（dpr 上限 1.5、Environment 反射、物理 timeStep、绳子分段、拖拽交互）SHALL 保持不变，仅调整挂载时机。

### Requirement: stagger 克制化保持
除 `data-stagger-limit` 显式覆盖的容器外，其余 `[data-stagger]` 容器 SHALL 继续受 `STAGGER_LIMIT=6` 约束。

## REMOVED Requirements
无
