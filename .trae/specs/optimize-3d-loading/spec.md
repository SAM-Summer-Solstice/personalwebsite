# 3D 页面加载优化（Optimize 3D Loading）Spec

## Why
posts 页面已流畅，但 projects / about 页切换时仍卡顿。基于代码事实的根因：

1. **切页瞬间任务叠加**：切到 projects/about 时，同一帧内发生 lazy chunk 下载 + WebGL/Canvas 初始化 + rapier 物理初始化 + GLB 解析 + GSAP 动效初始化 → 主线程长任务阻塞首帧
2. **Lanyard 持续渲染负担**（[Lanyard.jsx](src/components/Lanyard.jsx)）：`dpr={[1, 2]}`（全屏高度画布像素 4 倍）、`<Environment>` 多 Lightformer 渲染 pass、rapier 物理每帧 step、Band `useFrame` 每帧重建几何
3. **网络等待**：about 页首入需下载 2.4MB GLB + Lanyard chunk（~2.4MB）+ rapier，projects 页首入需下载 ProjectsNetwork chunk

用户提出两个方向：① 只加载可视范围 + 一小部分；② 提前预加载资源。本 spec 采用**两者组合 + 渲染降负**：

## What Changes
- **空闲预取（消除网络等待）**：新增 `src/preload.js`，在页面 `load` 后 `requestIdleCallback` 依次预取 ProjectsNetwork chunk、Lanyard chunk、`card.glb`、`lanyard.png`（fetch 预热浏览器缓存），进入对应页面时资源已在缓存
- **3D 初始化与首帧错峰（消除 CPU 长任务）**：
  - `ProjectsNetwork`：Canvas 改为「容器进入视口才挂载」，挂载前用同尺寸轻量占位；挂载延迟到下一帧（rAF），不与页面首帧同帧
  - `Lanyard`：Canvas 挂载同样延迟一帧（rAF 后再真正创建 Canvas），Suspense 占位期间显示现有 loading 提示
- **Lanyard 渲染降负**：`dpr` 上限 `[1, 2]` → `[1, 1.5]`（全屏画布像素 4 倍 → 2.25 倍，悬浮吊牌为半透明小物件，视觉差异可忽略，GPU 压力大减）
- **保持**：drei `<Environment>`（金属/清漆材质需要环境反射，属视觉核心）、GSAP 动效限量（前 6 个条目）不动

## Impact
- Affected specs: `add-lanyard-to-about`（Lanyard 渲染）、`perf-optimization-review`（懒加载/预取）、`add-gsap-motion`
- Affected code:
  - `src/preload.js`（新建：空闲预取）
  - `src/App.jsx`（load 后触发预取）
  - `src/components/sections/ProjectsNetwork.jsx`（可视才挂载 Canvas + rAF 错峰）
  - `src/components/Lanyard.jsx`（rAF 错峰 + dpr 1.5）
  - `src/components/ContentArea.css`（如占位样式微调）

## ADDED Requirements

### Requirement: 空闲预取资源
系统 SHALL 在页面加载完成后的空闲时间预取 3D 相关资源，进入页面时无网络等待。

#### Scenario: 页面 load 后
- **WHEN** 站点加载完成且浏览器空闲
- **THEN** 后台预取 ProjectsNetwork / Lanyard 的 JS chunk、card.glb、lanyard.png，进入 projects/about 页时资源已命中缓存

### Requirement: 3D 初始化与首帧错峰
系统 SHALL 避免 3D 场景初始化与页面首帧同帧执行，且仅在容器进入视口后挂载。

#### Scenario: 切到 projects 页
- **WHEN** 用户切换/滚动使星图容器进入视口
- **THEN** 星图 Canvas 在下一帧初始化，切页首帧只渲染文本布局与动效，主线程不出现长任务

#### Scenario: 切到 about 页
- **WHEN** 用户进入 about 页（吊牌容器可见）
- **THEN** Lanyard 的 Canvas 延迟到下一帧创建，Suspense 占位期间保持 loading 提示，初始化与页面首帧错峰

### Requirement: Lanyard 渲染降负
系统 SHALL 降低 Lanyard 画布像素压力。

#### Scenario: about 页吊牌渲染
- **WHEN** 吊牌 Canvas 运行
- **THEN** dpr 上限为 1.5（原 2），GPU 帧率改善，视觉差异可接受

## MODIFIED Requirements

### Requirement: 懒加载保持
`ProjectsNetwork` / `Lanyard` 继续按页懒加载（chunk 不进主包），叠加空闲预取。

## REMOVED Requirements
无
