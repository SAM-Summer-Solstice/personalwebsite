# About 页集成 Lanyard 3D 组件 Spec

## Why
`~/about` 页面在宽屏（桌面）下为单列纯文字排版，右侧大片空白、页面显得空旷。集成 React Bits 的 Lanyard 组件（3D 物理模拟挂绳吊牌）填充右侧，为"关于页"增加视觉张力与科技感，贴合站点暗色极简风格，并与既有 Dither 3D 背景呼应。

## What Changes
- 安装依赖：`@react-three/drei`、`@react-three/rapier`、`meshline`（版本需与现有 `@react-three/fiber ^9.7`、`three ^0.185` 兼容）
- 获取 React Bits 的资产 `card.glb`、`lanyard.png`（原仓库路径 `src/assets/lanyard/`），放入本项目 `src/assets/lanyard/`
- `vite.config.js` 增加 `assetsInclude: ['**/*.glb']`
- 新增 `src/components/Lanyard.jsx` + `Lanyard.css`：透明背景 Canvas、暗色主题协调、默认使用模型内置纹理（不传自定义前后图）
- `AboutSection` 改为桌面两栏布局：左侧保留现有文字内容，右侧为 sticky 定位的 Lanyard
- 窄屏（< 1024px）隐藏右侧 Lanyard，恢复为现有单列排版，避免移动端性能负担与挤压
- **不引入** `@react-three/postprocessing`（历史原因：该项目 postprocessing 曾导致 r3f 渲染循环冻结）；Lanyard 所需 `Environment`/`Lightformer` 来自 drei，不依赖 postprocessing

## Impact
- Affected specs: `add-homepage`（组件可替换性预留）、`create-hybrid-terminal-blog`（站点整体结构）
- Affected code:
  - `package.json`（新增依赖）
  - `vite.config.js`（assetsInclude）
  - `src/components/sections/AboutSection.jsx`（两栏布局）
  - `src/components/ContentArea.css`（about 区块样式：布局容器、侧栏、响应式）
  - 新增 `src/components/Lanyard.jsx`、`src/components/Lanyard.css`、`src/assets/lanyard/card.glb`、`src/assets/lanyard/lanyard.png`

## ADDED Requirements

### Requirement: Lanyard 组件集成
系统 SHALL 集成 React Bits Lanyard 组件，并能在 about 页面正常渲染。

#### Scenario: 依赖与资产就绪
- **WHEN** 执行 `npm run build`
- **THEN** 依赖安装成功、`card.glb`/`lanyard.png` 可被 Vite 正常解析打包，构建通过

#### Scenario: 渲染无异常
- **WHEN** 用户切换到 `~/about` 页面
- **THEN** Lanyard 正常显示，浏览器控制台无报错，r3f 渲染循环不冻结（挂绳随物理模拟自然摆动，可拖拽吊牌）

#### Scenario: 暗色协调
- **WHEN** about 页面处于暗色主题下
- **THEN** Canvas 背景透明，与站点暗色背景、强调色（`--accent`/`--accent-2`）视觉协调

### Requirement: About 页面两栏布局
系统 SHALL 在桌面端将 about 页面改为"左文字、右 Lanyard"两栏布局。

#### Scenario: 桌面端
- **WHEN** 视口宽度 ≥ 1024px
- **THEN** 左侧为现有全部文字内容（宽度受限、排版不变），右侧为 Lanyard 侧栏，滚动时侧栏保持可见（sticky）

#### Scenario: 窄屏降级
- **WHEN** 视口宽度 < 1024px
- **THEN** 右侧 Lanyard 隐藏，页面保持现有单列纯文字排版，内容完整不受影响

## MODIFIED Requirements

### Requirement: About 页面内容完整性
`~/about` 现有全部内容（个人介绍、学习方向、兴趣爱好、数据、联系方式、博客初衷）在新布局下 SHALL 保持完整、排版不回归。

## REMOVED Requirements

### Requirement: About 单列全宽布局
**Reason**: 宽屏下右侧空白过多，布局失衡；两栏布局可更好利用空间。
**Migration**: 内容区容器宽度收缩并左对齐，与站点 `max-width: 1700px` 版心体系一致；窄屏回退到单列。
