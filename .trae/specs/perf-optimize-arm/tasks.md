# Tasks

- [ ] Task 1: 依赖清理
  - [ ] SubTask 1.1: `npm uninstall @giscus/react postprocessing @react-three/postprocessing`（确认 src 无 import 引用）
  - [ ] SubTask 1.2: `npm run build` 通过；记录优化前/后主包体积对比（记录在任务备注）
- [ ] Task 2: GLB 资产压缩
  - [ ] SubTask 2.1: `npx gltf-transform optimize src/assets/lanyard/card.glb src/assets/lanyard/card.glb --compress draco`（draco 压缩，drei useGLTF 原生支持解码）
  - [ ] SubTask 2.2: 验证压缩后文件体积 <1MB（原 2400KB）；`npm run build` 产物 card.glb 对应减小
  - [ ] SubTask 2.3: 浏览器验证 about 页吊牌正常加载渲染（无解码错误、无报错）
- [ ] Task 3: 运行时降载
  - [ ] SubTask 3.1: 新建低端判定工具（如 `src/lib/device.js`：`export const LOW_END = (navigator.hardwareConcurrency || 8) <= 4`）
  - [ ] SubTask 3.2: `Dither.jsx`：`gl={{ antialias: false, powerPreference: 'low-power' }}`；`frameloop` 随 `document.hidden` 动态切换（visibilitychange 监听，hidden → 'demand'，visible → 'always'）；LOW_END 时 dpr 保持 1（当前已 1，注明即可）
  - [ ] SubTask 3.3: `ProjectsNetwork.jsx` / `Lanyard.jsx`：dpr 上限按 LOW_END 降为 1（LOW_END ? [1, 1] : [1, 1.5]）
- [ ] Task 4: bundle 拆分
  - [ ] SubTask 4.1: `vite.config.js` 配 `build.rollupOptions.output.manualChunks`：`react`（react/react-dom）、`three`（three/@react-three/fiber/drei 及 3D 相关）、`gsap`、`marked`（及 `marked` 依赖）独立 chunk
  - [ ] SubTask 4.2: `npm run build` 通过；确认 Lanyard/ProjectsNetwork 仍为独立懒加载 chunk
- [ ] Task 5: 回归与测量
  - [ ] SubTask 5.1: 浏览器回归：首页/列表/单篇/项目/关于逐页——3D 星图、吊牌、波浪背景、GSAP 动效、终端、登录/评论/点赞全部正常；控制台无 error；隐藏标签页后波浪暂停、切回恢复
  - [ ] SubTask 5.2: 输出优化前后体积对比：`dist/` 总大小、主包（gzip）、card.glb、Lanyard chunk、依赖裁剪项

# Task Dependencies
- [Task 2] 依赖 [Task 1]（干净依赖树后再压缩）
- [Task 3] 依赖 [Task 1]
- [Task 4] 独立，可与 [Task 2]/[Task 3] 并行
- [Task 5] 依赖 [Task 1..4]
