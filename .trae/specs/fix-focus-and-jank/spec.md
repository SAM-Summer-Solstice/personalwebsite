# 修复焦点提示回归与 projects/about 卡顿（Fix Focus Regression & Jank）Spec

## Why
两个真实问题（全栈重构引入/暴露）：
1. **焦点提示回归**：从首页"最近文章"点击文章，重构后直接跳单篇（`/posts/:id`），丢失了原有"跳转到 posts 列表并滚动高亮该文章"的焦点提示（focusId 从未送达 blog 场景）
2. **projects/about 卡顿**：实测定位（headless Chrome 1440×900，5s 窗口）——非阻塞型卡顿，是**帧预算余量不足**：
   - about 页 FPS 112 vs home 146（低 24%），帧间隔 p95 12.6ms（60Hz 预算 16.7ms，余量仅 4ms），交互/拖动瞬间即掉帧
   - about 页 R3F render 每帧开销 0.60ms（home 的 3 倍）：**MeshLine 每帧 `getPoints(32)` + `setPoints` 重建（新分配 Float32Array）+ rapier step 主线程 + 全屏 Dither 4 层 fbm shader 并存**；MinorGC 8 次/5s（home 0 次）
   - projects 星图本身很轻（6 节点），降幅主要来自"第二个 canvas 渲染提交"与 Dither 并存

## What Changes
### Focus 回归修复
- `src/App.jsx` `handleNavigate`：`tab === 'blog' && id` 时改为 `navigate('/posts', { state: { focusId: id } })`（进入列表 + 携带高亮 id），不再直接跳单篇
- `src/components/sections/BlogSection.jsx`：`BlogCard` 的 `onOpen` 改用 `useNavigate()` 直接进 `/posts/:id`（列表内点卡片仍进单篇；深链接 `/posts/:id` 行为不变）；`focusId` 高亮逻辑已存在（flashId/is-focused/scrollIntoView），确认由 prop 传入即生效
- projects 的 focusId 行为保留（现有 state 传递不变）

### 卡顿优化（about 为主，projects 顺带）
- `src/components/Lanyard.jsx` `Band`：
  - 物理步频：桌面 `timeStep` 1/60 → **1/30**（与 isMobile 一致；绳子短，观感近似，物理计算减半）
  - MeshLine 重建：`getPoints` 分段 32 → **16**；缓存上一帧曲线点，**点位移低于阈值时跳过 `setPoints` 重建**（静止省每帧分配）
- `src/components/Dither.jsx` 与 3D 并存降载：App 在 `activeTab === 'projects' || activeTab === 'about'` 时给 Dither 传 `disableAnimation={true}`（背景波浪静止但仍渲染像素化背景，观感近似），其余页面保持动画；释放一份全屏 shader 的 GPU 压力
- dpr 上限维持现状（Dither dpr=1、星图/吊牌 [1,1.5]），本次不动

## Impact
- Affected specs: 新增（bug 修复 + 性能）；关联 `fullstack-django-refactor`（引入回归）
- Affected code:
  - `src/App.jsx`（handleNavigate 行为 + Dither disableAnimation 按 tab）
  - `src/components/sections/BlogSection.jsx`（onOpen 用 useNavigate）
  - `src/components/Lanyard.jsx`（timeStep、getPoints 分段、静止跳过重建）
  - `src/components/Dither.jsx`（无改动或仅确认 disableAnimation 行为，若无需改则不动）
- 不改后端/部署/视觉设计

## ADDED Requirements

### Requirement: 首页最近文章 → 列表焦点提示
系统 SHALL 从首页点击文章后进入 posts 列表并高亮该文章（焦点提示）。

#### Scenario: 首页点击文章
- **WHEN** 用户在首页"最近文章"点击某篇
- **THEN** 跳转到 `/posts` 列表页，滚动定位到该文章卡片并播放一次性高亮（focusId 生效），不再直接进单篇

### Requirement: 单篇访问方式不变
系统 SHALL 保留列表内点卡片与深链接直达单篇。

#### Scenario: 列表点卡片与深链接
- **WHEN** 用户在 posts 列表点击卡片，或直接访问 `/posts/<id>`
- **THEN** 正常进入单篇内容页（与原行为一致）

### Requirement: about/projects 流畅度提升
系统 SHALL 降低 about/projects 页的每帧主线程与 GPU 负载，扩大帧预算余量。

#### Scenario: 性能测量
- **WHEN** 按同口径（headless 1440×900，5s 稳定窗口）复测
- **THEN** about 页 R3F render 每帧开销与 JS 执行时长下降、帧间隔 p95 明显小于 12.6ms、FPS 相对 home 差距缩小；交互拖动不掉帧感

### Requirement: 视觉无回归
系统 SHALL 优化不改变观感。

#### Scenario: 视觉回归
- **WHEN** 逐页检查
- **THEN** 波浪背景（projects/about 静态化后仍为像素波浪观感）、吊牌、星图、动效正常；控制台无 error；`npm run build` 通过

## MODIFIED Requirements
无

## REMOVED Requirements
无
