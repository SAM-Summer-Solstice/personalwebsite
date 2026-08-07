# Checklist

- [x] load 后空闲预取 ProjectsNetwork / Lanyard chunk 与 card.glb / lanyard.png；进入页面无网络等待（冷加载 ~1.9s、缓存命中竞态场景 ~0.4s 均自动触发；二次进入 0 新增请求）
- [x] 切到 projects 页首帧无长任务卡顿；星图容器进入视口才初始化 Canvas（首帧无 canvas，IO+rAF 后 ~193ms 挂载，切页首帧 16-32ms）
- [x] 切到 about 页首帧无长任务卡顿；Lanyard Canvas 与首帧错峰，占位期间有 loading 提示（"loading lanyard…" 呼吸占位实测存在）
- [x] Lanyard dpr 上限降为 1.5，渲染流畅，视觉差异可接受（deviceScaleFactor=2 下实测画布/CSS = 1.5）
- [x] 星图/吊牌交互（拖拽、自转、悬停）无回归；GSAP 动效无回归（星图拖拽像素差 1.63 倍、吊牌拖拽 13 倍 + 阻尼收敛、clip-path 遮罩揭开正常）
- [x] `npm run build` 通过（主包 1305KB/gzip 382KB，Lanyard 2.4MB 独立分包，621 modules）
