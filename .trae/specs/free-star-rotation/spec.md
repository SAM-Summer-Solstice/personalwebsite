# 星图自由旋转（Free Star Rotation）Spec

## Why
`~/projects` 的 3D 星图手动拖拽仍是 OrbitControls 的**轨道式**旋转：相机绕目标点公转，水平拖改变方位角、竖直拖调整俯仰角，用户体感是"只能在两个方向感上转"，无法像拧动真实物体那样往任意方向拖拽翻转。用户核心诉求是修改**鼠标拖拽**的旋转方式；同时自转存在"固定轴"问题一并修正。

## What Changes
- **手动拖拽改为 TrackballControls（虚拟轨迹球）**：`OrbitControls` → `TrackballControls`，鼠标按住往任意方向拖，星图直接随手势翻转（可倒置、无轨道限制），保留滚轮缩放与阻尼惯性、禁止平移（noPan）、缩放范围 min/max 3.2–11
- **自转改为"旋转轴漂移"**：不再绕固定世界轴（Y/X/Z 固定速率），而是用低频正弦组合实时计算一条在世界空间平滑漂移的旋转轴（频率互成无理比、轨迹不重复），每帧绕该轴旋转小角度 → 无固定轴，自转朝任意方向翻滚
- **保留**：深度 cue、悬停 tooltip、标签常显开关、`prefers-reduced-motion` 关闭自转、窄屏降级逻辑

## Impact
- Affected specs: `differentiate-content-pages`（3D 星图产物）、`star-network-polish`（标签/不透明/白字均不受影响）
- Affected code:
  - `src/components/sections/ProjectsNetwork.jsx`（import 替换 + 拖拽控件替换 + 自转逻辑 + 文件头注释）

## ADDED Requirements

### Requirement: 轨迹球拖拽旋转
系统 SHALL 使用虚拟轨迹球式拖拽（TrackballControls），鼠标按住可向任意方向旋转星图，不受轨道/极角限制。

#### Scenario: 任意方向拖拽
- **WHEN** 用户按住鼠标向任意方向拖动
- **THEN** 星图跟随手势直接旋转，可拖至任意角度（含上下翻转），并带阻尼惯性

#### Scenario: 缩放与平移限制
- **WHEN** 用户滚轮缩放
- **THEN** 相机在 3.2–11 距离范围内缩放；星图不可平移（noPan）

### Requirement: 自转旋转轴平滑漂移
系统 SHALL 在自转时让旋转轴方向随时间连续漂移，使星图无固定旋转轴。

#### Scenario: 自转翻滚
- **WHEN** 星图自动旋转
- **THEN** 旋转轴在世界空间持续缓慢变化，节点沿无固定轴的轨迹运动，上下顶点与中部节点均向任意方向翻转

#### Scenario: 轨迹不重复
- **WHEN** 长时间观察自转
- **THEN** 运动姿态不呈现可辨识的周期性重复（频率互成无理比）

## MODIFIED Requirements

### Requirement: 手动拖拽旋转方式
手动拖拽由 OrbitControls 轨道式旋转改为 TrackballControls 虚拟轨迹球旋转，任意方向可转、可翻转。

### Requirement: reduced-motion
`prefers-reduced-motion` 开启时自转保持关闭，手动拖拽仍可用。

## REMOVED Requirements

### Requirement: OrbitControls 轨道式拖拽
**Reason**: 轨道式公转只能水平转方位、竖直调俯仰，体感受限，无法往任意方向拖拽翻转。
**Migration**: 由 TrackballControls 虚拟轨迹球替代。

### Requirement: 固定世界轴自转
**Reason**: 三个固定世界轴 + 固定速率的增量旋转，合成后等效于绕单一固定角速度矢量旋转，节点被约束在固定圆周轨迹，无法任意方向旋转。
**Migration**: 由漂移轴旋转替代。
