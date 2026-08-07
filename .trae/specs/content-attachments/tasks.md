# Tasks

- [x] Task 1: 建立附件目录约定
  - [x] SubTask 1.1: 新建 `public/images/`、`public/files/`、`public/media/`，各放 `.gitkeep`
- [x] Task 2: Markdown 渲染器附件链接
  - [x] SubTask 2.1: `MarkdownBody.jsx` 在 renderer 中新增 `link` 重写：href 命中附件扩展名（pdf/docx/xlsx/pptx/zip/rar/7z/tar/gz/mp4/mov/webm/mkv/avi/mp3/wav/flac）时输出带 `md-file-link` 类的 `<a>`；其余链接原样
  - [x] SubTask 2.2: 保持现有 heading 锚点逻辑不变
- [x] Task 3: 媒体与附件样式
  - [x] SubTask 3.1: `ContentArea.css` 新增 `.md-body img`：max-width 100%、height auto、margin-top 14px、border-radius 4px、display block
  - [x] SubTask 3.2: 新增 `.md-body video`：max-width 100%、height auto、display block、margin-top 14px
  - [x] SubTask 3.3: 新增 `.md-body .md-file-link`：mono 小字 13px、muted 色、hover 变 accent、`::before` 前置 `↓ `
- [x] Task 4: 构建与运行验证
  - [x] SubTask 4.1: `npm run build` 通过
  - [x] SubTask 4.2: dev 验证：marked v18 link 回调经 node 验证（附件链接带 md-file-link 类、普通链接/图片不带），dev server（5175）无报错

# Task Dependencies
- [Task 2] 依赖 [Task 1]（路径约定）
- [Task 3] 依赖 [Task 1]
- [Task 4] 依赖 [Task 2]、[Task 3]
