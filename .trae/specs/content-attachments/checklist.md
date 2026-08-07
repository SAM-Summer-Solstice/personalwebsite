# Checklist

- [x] `public/images`、`public/files`、`public/media` 目录存在且含 `.gitkeep`
- [x] md 中绝对路径图片（`/images/x.png`）渲染为响应式图片，不溢出、窄屏不破版
- [x] 附件链接（如 `[x.pdf](/files/x.pdf)`）渲染为带 `md-file-link` 类的克制样式链接，hover 变 accent
- [x] md 内嵌 `<video>` 自适应宽度，带播放控件，窄屏不破版
- [x] 既有正文排版（标题锚点、代码块、引用、链接）不受影响
- [x] 暗色背景下媒体与附件视觉协调
- [x] `npm run build` 通过
