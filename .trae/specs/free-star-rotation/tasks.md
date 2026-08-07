# Tasks

- [x] Task 1: 手动拖拽改为 TrackballControls（虚拟轨迹球）
  - [x] SubTask 1.1: `ProjectsNetwork.jsx` 将 `OrbitControls` 从 drei import 中替换为 `TrackballControls`
  - [x] SubTask 1.2: 控件 JSX 替换：`noPan`、`minDistance={3.2}`、`maxDistance={11}`、`dynamicDampingFactor={0.08}`（保留滚轮缩放与阻尼）
  - [x] SubTask 1.3: 更新文件头注释（OrbitControls → TrackballControls，说明"按住拖拽可任意方向翻转"）
- [x] Task 2: 自转改为旋转轴漂移（任意方向翻滚）
  - [x] SubTask 2.1: 移除 `Y_AXIS`/`X_AXIS`/`Z_AXIS` 常量与固定速率旋转
  - [x] SubTask 2.2: 新增模块级漂移轴临时向量与时间累积 ref；`useFrame` 中用低频正弦组合（频率互成无理比）驱动轴向量 normalize 后 `rotateOnWorldAxis(axis, delta * speed)`
  - [x] SubTask 2.3: 更新文件头注释，说明"旋转轴平滑漂移"机制
- [x] Task 3: 构建与运行验证
  - [x] SubTask 3.1: `npm run build` 通过
  - [x] SubTask 3.2: dev 目视验证：鼠标拖拽任意方向旋转（含翻转）、滚轮缩放正常、自转无固定轴、reduced-motion 关闭自转、标签/悬停/窄屏不受影响

# Task Dependencies
- [Task 3] 依赖 [Task 1]、[Task 2]
