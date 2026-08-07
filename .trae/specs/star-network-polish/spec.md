# 3D 星图精修：不透明小球 + 白字标签 + 全部标签开关 Spec

## Why
`~/projects` 的 3D 星图目前：① 小球按深度做半透明渐变（远球过淡，像雾而非星），用户希望小球始终不透明、只保留"近大远小"的立体感；② 悬停名称 tooltip 带背景和边框，不够纯粹，用户希望只要白字；③ 想一眼看到全部节点名称，需要在页面描述旁加一个开关按钮。

## What Changes
- **小球不透明**：移除节点材质的半透明/动态透明度，只保留按相机距离的**大小缩放**（depth cue 的"近大远小"），节点始终实心显示状态色
- **标签白字**：`.network-tooltip`（悬停 tooltip 与常显标签共用）去掉背景、边框、阴影，改为纯白文字（`#fff`）+ 轻微 text-shadow 保证在浅色小球上的可读性
- **全部标签开关**：在 `~/projects` 页面描述（`section-desc` "折腾过的一些硬件与软件项目。"）旁新增一个按钮（如 `标签` / `隐藏标签`），按下后所有节点名称常显，再按隐藏
  - `ProjectsSection` 增加 `showLabels` 状态并传 `ProjectsNetwork`
  - `ProjectsNetwork` 节点在 `showLabels` 或悬停时渲染名称标签（同一套白字样式）

## Impact
- Affected specs: `differentiate-content-pages`（3D 星图是其产物，本次仅交互/样式迭代）、`content-management`
- Affected code:
  - `src/components/sections/ProjectsSection.jsx`（新增开关按钮 + `showLabels` 状态）
  - `src/components/sections/ProjectsNetwork.jsx`（不透明节点、标签条件渲染、接收 `showLabels`）
  - `src/components/ContentArea.css`（`.network-tooltip` 白字化、新增开关按钮样式）

## ADDED Requirements

### Requirement: 标签开关按钮
系统 SHALL 在 `~/projects` 页面描述旁提供按钮，切换全部节点名称的显示。

#### Scenario: 显示全部标签
- **WHEN** 用户点击开关按钮（文案如"标签"）
- **THEN** 所有节点旁常显名称（白字），按钮文案变为"隐藏标签"

#### Scenario: 隐藏全部标签
- **WHEN** 用户再次点击按钮
- **THEN** 全部常显名称消失，恢复"仅悬停显示"；按钮文案回到"标签"

### Requirement: 节点名称白字标签
系统 SHALL 以纯白文字（无背景、无边框）显示节点名称。

#### Scenario: 悬停显示
- **WHEN** 鼠标悬停某节点
- **THEN** 该节点名称以白字显示，无背景无边框，轻微 text-shadow 保证可读

#### Scenario: 常显模式
- **WHEN** 标签开关开启
- **THEN** 所有节点名称以同样白字样式常显

## MODIFIED Requirements

### Requirement: 节点小球渲染
节点小球 SHALL 保持不透明（状态色实心），深度感仅通过大小缩放体现（近大远小），不再按距离改变透明度。

### Requirement: tooltip 样式
`.network-tooltip` 由"背景 + 边框 + 阴影"改为"纯白文字 + 轻微 text-shadow"，移除背景、边框与 box-shadow。

## REMOVED Requirements

### Requirement: 节点深度透明度渐变
**Reason**: 半透明小球让远球过淡、观感像雾而非星图。
**Migration**: 透明度移除，深度感由 scale（近大远小）承担。
