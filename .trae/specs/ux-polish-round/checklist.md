# Checklist

- [x] posts 单篇视图再次点击导航 posts 返回列表页；普通导航不受影响
- [x] 返回顶部按钮位于收起终端之上，不与其重叠（桌面与窄屏）
- [x] 返回顶部按钮不再出现 `cd ~` 提示（hover 与点击均无）
- [x] 背景波浪持续流动、肉眼可见（用户确认「现在动起来了」）；亮度/色阶参数未改动
- [x] 运行时探针定位到根因：R3F v9 对 ShaderMaterial uniforms 按值拷贝，原始值（time）赋值到不了 shader；经 materialRef 直接改 material.uniforms 修复（探针已完成使命并移除）
- [x] `npm run build` 通过
