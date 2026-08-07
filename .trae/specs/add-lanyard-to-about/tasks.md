# Tasks

- [x] Task 1: 安装 Lanyard 依赖并校验版本兼容
  - [x] SubTask 1.1: 安装 `@react-three/drei`（^10.7.8）、`@react-three/rapier`（^2.2.0）、`meshline`（^3.3.1），与 fiber v9 / three 0.185 兼容
  - [x] SubTask 1.2: 执行 `npm run build` 验证依赖无版本冲突、构建不报错
- [x] Task 2: 获取 Lanyard 资产文件
  - [x] SubTask 2.1: 定位 React Bits 官方仓库（DavidHDev/react-bits）中 `src/assets/lanyard/` 下的 `card.glb` 与 `lanyard.png`
  - [x] SubTask 2.2: 下载到本项目 `src/assets/lanyard/`（`card.glb` 2.4MB、`lanyard.png` 7.5KB）
- [x] Task 3: 配置 Vite 支持 .glb 资源
  - [x] SubTask 3.1: `vite.config.js` 增加 `assetsInclude: ['**/*.glb']`
- [x] Task 4: 创建 Lanyard 组件
  - [x] SubTask 4.1: 创建 `src/components/Lanyard.jsx`（按 React Bits 源码，import 路径指向 `../assets/lanyard/`）
  - [x] SubTask 4.2: 创建 `src/components/Lanyard.css`（透明背景、居中；高度随父容器填充）
- [x] Task 5: About 页面两栏布局改造
  - [x] SubTask 5.1: `AboutSection.jsx` 外层包 `about-layout`（左 `about-main` + 右 `about-side` Lanyard 容器）
  - [x] SubTask 5.2: `ContentArea.css` 增加 about 两栏布局、右侧 sticky 侧栏样式；< 1024px 隐藏侧栏回退单列
- [x] Task 6: 构建与运行验证
  - [x] SubTask 6.1: `npm run build` 通过（593 modules，`card.glb` / `lanyard.png` 正常打包进 dist）
  - [x] SubTask 6.2: dev server 起服务（http://localhost:5174/），依赖预构建完成、无模块报错；切到 `~/about` 由浏览器预览验证渲染、物理、暗色与窄屏降级

# Task Dependencies
- [Task 1] 依赖 [Task 1.1]（版本兼容性决定后续组件代码）
- [Task 2] 依赖 [Task 2.1]（先定位再下载）
- [Task 4] 依赖 [Task 1]、[Task 2]、[Task 3]
- [Task 5] 依赖 [Task 4]
- [Task 6] 依赖 [Task 4]、[Task 5]
