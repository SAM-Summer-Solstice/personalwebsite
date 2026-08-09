# Checklist

- [ ] `@giscus/react`、`postprocessing`、`@react-three/postprocessing` 已卸载，`src/` 无相关 import，`npm run build` 通过
- [ ] `card.glb` 压缩后 <1MB（原 2400KB）；about 页吊牌正常渲染，控制台无解码/加载错误
- [ ] 低端设备判定（hardwareConcurrency ≤ 4）：Dither/星图/吊牌 dpr 上限为 1，视觉不变
- [ ] 页面隐藏时 Dither 渲染循环暂停（frameloop 切换），切回恢复，无异常
- [ ] vite manualChunks 生效：react/three/gsap/marked 独立 vendor chunk；Lanyard/ProjectsNetwork 仍懒加载
- [ ] 全站浏览器回归无退化：3D 星图/吊牌/波浪/动效/终端/登录/评论/点赞正常，控制台无 error
- [ ] 优化前后体积对比已记录：`dist/` 总大小与主包 gzip 下降
- [ ] 本地开发不受影响（`npm run build` 与 dev 正常）
