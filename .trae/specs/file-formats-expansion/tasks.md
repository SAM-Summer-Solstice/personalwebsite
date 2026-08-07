# Tasks

- [x] Task 1: 扩展附件格式识别
  - [x] SubTask 1.1: `MarkdownBody.jsx` 将 `FILE_EXT` 扩展为工科主流格式全表（FILE_CATS：文档/代码脚本/科学数据/3D-CAD仿真/嵌入式可执行/压缩安装包/媒体，133 个扩展名）
  - [x] SubTask 1.2: `data-ext` 提取正则放宽为 `\.([a-z0-9_]{1,8})$`（下限放宽以覆盖 c/h/m/o/a/s 等单字符扩展名，上限 8 满足长扩展名）
- [x] Task 2: 附件类别着色
  - [x] SubTask 2.1: `MarkdownBody.jsx` 定义格式→类别映射（code/doc/model/media/other），`renderer.link` 为附件链接输出 `data-cat`
  - [x] SubTask 2.2: `ContentArea.css` 新增 `.md-file-link[data-cat='code']::before { color: var(--accent); }` 与 `[data-cat='doc']::before { color: var(--accent-2); }`，默认改 `--text-muted` 灰
- [x] Task 3: 构建与验证
  - [x] SubTask 3.1: `npm run build` 通过
  - [x] SubTask 3.2: node 脚本验证 9/9：py→code、c→code、pptx→doc、stl→model、ipynb→code、sldprt→model（长扩展名）、png（链接形式）→media、普通外链无类、`![]()` 图片走 image 渲染

# Task Dependencies
- [Task 2] 依赖 [Task 1]
- [Task 3] 依赖 [Task 1]、[Task 2]
