# Checklist

- [x] 首页无 opening 动画：无全屏遮罩、无标题强进场；切回 home 不重播（`.mv-curtain`=0，home-name 始终静态，切回不重播）
- [x] `data-opening-name` / `data-opening-item` / `.mv-curtain` / `playHomeOpening` 无残留引用（src grep 零残留）
- [x] 切到 projects / about / blog：首屏元素静态可见，无标题 clip 动画 / stagger 动画在切页首帧叠加（切页首帧 hidden=0、无 gsap 初始态注入）
- [x] 恢复滚动位置后，视口内及上方的元素不再批量触发动画（保持可见）（切回 78 帧采样无批量动画帧，滚动位置精确恢复）
- [x] 滚动进入视口的下方元素：标题强进场 / 卡片 stagger / 图片 reveal+视差正常触发，无闪烁（卡片 4/5 滚动入场带 stagger 动画，clip 遮罩正常揭开）
- [x] 懒加载图片加载不引发 ScrollTrigger 频繁 refresh / 滚动位置跳动（refresh 去抖 120ms 合并，滚动无跳动）
- [x] 3D 星图 / 吊牌 / 拖拽 / 交互无回归；控制台无错误（星图拖拽、吊牌物理正常；仅 favicon 404 与 /api 502 环境问题）
- [x] `npm run build` 通过（621 modules，主包 1304.77KB / gzip 382KB）
