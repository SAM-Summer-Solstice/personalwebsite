# Checklist

- [x] 依赖（drei / rapier / meshline）安装成功且与 fiber v9、three 0.185 兼容
- [x] `card.glb` 与 `lanyard.png` 已放入 `src/assets/lanyard/` 且可被导入
- [x] `vite.config.js` 已配置 `assetsInclude: ['**/*.glb']`
- [x] `Lanyard.jsx` / `Lanyard.css` 已创建，组件逻辑忠实于 React Bits 源码
- [x] about 页面渲染 Lanyard 无 console 报错、r3f 渲染循环不冻结、挂绳可物理摆动
- [x] 桌面端（≥1024px）两栏布局：左文字、右 sticky Lanyard，内容完整排版正常
- [x] 窄屏（<1024px）隐藏 Lanyard，单列排版不受影响
- [x] 暗色主题下 Canvas 透明背景与站点风格协调
- [x] `npm run build` 通过
