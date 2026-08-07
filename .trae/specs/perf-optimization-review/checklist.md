# Checklist

- [x] 主 JS bundle 显著减小：主包 3613KB → 1305KB（gzip 1238 → 382KB）；Lanyard（rapier/drei/meshline + GLB）、Giscus、ProjectsNetwork（TrackballControls）均独立分包，不再进首屏主包
- [x] about 页进入时 Lanyard 按需加载并有同尺寸占位（.about-side-placeholder），无白屏/布局跳动
- [x] blog 单篇视图 Giscus 按需加载（lazy + Suspense，fallback「评论加载中…」）
- [x] 返回顶部按钮滚动更新已 rAF 节流（每帧最多一次 setState）
- [x] Dither pixelSize 波动恒在 2~3，采样数不倍增，背景观感保留
- [x] 首屏不加载重型依赖；页面切换、滚动、GSAP 动效、背景波动无回归（浏览器运行无错误）
- [x] `npm run build` 通过
