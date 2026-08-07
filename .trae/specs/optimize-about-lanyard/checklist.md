# Checklist

- [x] 切到 about 页首帧：无 GLB 解析 / rapier / Environment 初始化长任务叠加（canvas 挂载晚于入场动画 619ms，WebGL 长任务距动画开始 777ms，rIC 空闲挂载生效）
- [x] 吊牌正常出现（无淡入、无灰屏），拖拽 / 绳子物理 / dpr 1.5 / Environment 反射无回归
- [x] about 页联系方式、博客初衷两个区块随滚动依次入场（y 位移 + 淡入，stagger 生效）
- [x] 其他页面的 `[data-stagger]` 仍受 `STAGGER_LIMIT=6` 约束，行为不变（blog-list 第 7 卡无动画初始态）
- [x] 控制台无错误；`npm run build` 通过
