# 面向低配 ARM 服务器的性能优化（Perf Optimize for ARM）Spec

## Why
计划用核桃派（Debian 12 arm64，**内存仅 981MB**、4 核 ARM、eMMC 存储）作生产服务器。当前构建产物与运行时对低配设备过重：**card.glb 2.4MB（未压缩）、Lanyard JS chunk 2.3MB（含 rapier）、主包 1.3MB**；Dither 全屏 WebGL 波浪**常驻所有页面**每帧渲染。需在部署前优化网页代码（传输体积 + 运行时负载），避免低配设备卡顿。**本次只做代码/构建优化，不做服务器部署。**

## What Changes
- **依赖清理**（无引用但仍在 package.json）：卸载 `@giscus/react`（评论已自建）、`postprocessing`、`@react-three/postprocessing`（Dither 已改为纯 three 实现，仅注释提及）→ 缩小依赖树与安装体积
- **3D 资产压缩**：`card.glb`（2400KB）用 `gltf-transform` 做 draco 压缩（drei `useGLTF` 原生支持 draco 解码），目标 <1MB；不影响 `useGLTF` 加载路径
- **运行时降载（面向低端设备）**：
  - Dither（常驻全屏 WebGL）：`antialias: false`（像素波浪风格无需抗锯齿）、`powerPreference: 'low-power'`；**页面隐藏（document.hidden）时暂停渲染循环**（r3f `frameloop` 动态切换），恢复可见再续
  - 3D 场景（Dither/ProjectsNetwork/Lanyard）统一低端判定：`navigator.hardwareConcurrency <= 4`（覆盖典型 ARM 板子）时 dpr 上限降为 1（当前 [1,1.5]）；窄屏降级逻辑保留
  - Lanyard 物理与绳线渲染参数保持，不做视觉降质
- **bundle 拆分**：vite 手动 chunk 拆分（react/react-dom、three/r3f、gsap、marked 独立 vendor chunk）→ 缓存友好 + 并行下载；首屏所需（react/three/gsap）随主包，3D/资产随用随载（已 lazy）
- **测量**：优化前后 `dist/` 各 chunk 体积与 gzip 对比；本地 browser 回归确认视觉无回归、控制台无错

## Impact
- Affected specs: 新增（性能优化）；关联既有 `perf-optimization-review`（已完成）与 3D 组件改动
- Affected code:
  - `package.json`（移除 3 个依赖）
  - `src/assets/lanyard/card.glb`（压缩产物，同路径覆盖）
  - `src/components/Dither.jsx`（antialias/powerPreference/后台暂停帧循环）
  - `src/components/sections/ProjectsNetwork.jsx`、`src/components/Lanyard.jsx`（低端 dpr 判定，与 Dither 共享判定函数）
  - `vite.config.js`（manualChunks）
- 不做：服务器部署、后端逻辑改动、视觉重设计

## ADDED Requirements

### Requirement: 构建产物瘦身
系统 SHALL 降低部署包体积，重点是 3D 资产与无效依赖。

#### Scenario: 构建后体积
- **WHEN** 执行 `npm run build`
- **THEN** `card.glb` 产物 <1MB；主包体积不增反降（依赖裁剪 + 拆分）；`dist/` 总大小明显下降（对比优化前）

### Requirement: 低端设备运行时降载
系统 SHALL 在低配设备（典型 ARM 板）上降低 GPU/CPU 负载而不改变观感。

#### Scenario: 低端设备访问
- **WHEN** `navigator.hardwareConcurrency <= 4` 的浏览器访问
- **THEN** Dither/星图/吊牌 dpr 上限为 1（原 1.5），波浪/星图/吊牌视觉不变但像素负载下降

#### Scenario: 页面隐藏时暂停动画
- **WHEN** 切换到其他标签页（document.hidden）
- **THEN** Dither 全屏波浪渲染循环暂停，切回后恢复，无视觉异常

### Requirement: 回归无退化
系统 SHALL 优化后功能与视觉不变。

#### Scenario: 全站回归
- **WHEN** 浏览器逐页访问（首页/列表/单篇/项目/关于）
- **THEN** 3D 星图、吊牌、波浪背景、GSAP 动效、终端、登录/评论/点赞全部正常，控制台无 error

## MODIFIED Requirements
无

## REMOVED Requirements
无
