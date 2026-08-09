# Checklist

- [x] `usePageMotion.js` 导出 `hideMotionElements(scope)`，对 `[data-reveal-title]`/`[data-reveal]`/`[data-stagger]` 直接子项/`.md-figure img` 用 `gsap.set` 注入与各动画 from 态一致的隐藏初始态
- [x] `hideMotionElements` 对 shouldSkip 判定为"已滚过/视口内"的元素不隐藏（与 initPageMotion 跳过逻辑一致）
- [x] `initPageMotion` 内的 `gsap.from` 改为 `gsap.fromTo`（显式 from），ScrollTrigger 触发逻辑 / shouldSkip / once:true 不变
- [x] `ContentArea.jsx` 在 `useLayoutEffect`（依赖 activeTab）中挂载/切页后立即调用 `hideMotionElements(shellRef.current)`，在浏览器绘制前隐藏
- [x] motionEpoch 机制保留（`app:content-ready` 防抖 → setMotionEpoch → initPageMotion 创建动画），仅不再负责注入隐藏态
- [x] 切页时 motionEpoch 重置为 0，新页挂载时 hideMotionElements 再次注入隐藏态
- [x] `npm run build` 通过
- [x] 刷新 / 、/posts、/posts/:id、/projects、/about 无"先出现再消失再动画"闪烁
- [x] 滚动触发动效正常（标题 clip、卡片 stagger、reveal、图片 reveal+视差）
- [x] 切页不重播已播放动画；首屏内/已滚过元素保持静态可见
- [x] 禁用 JS 验证内容仍可见（fail-open 契约保留）
- [x] Bug 1（posts 卡片点击）记录为"自愈/监控"，未做代码改动
