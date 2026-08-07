# Tasks

- [ ] Task 1: 建立附件目录约定
  - [ ] SubTask 1.1: 新建 `public/images/`、`public/files/`、`public/media/`，各放 `.gitkeep`
- [ ] Task 2: Markdown 渲染器附件链接
  - [ ] SubTask 2.1: `MarkdownBody.jsx` 在 renderer 中新增 `link` 重写：href 命中附件扩展名（.pdf/.docx/.doc/.xlsx/.zip/.mp4/.mov/.webm/.png/.jpg/.jpeg/.gif 之外的其他常见文档与媒体）时，输出带 `md-file-link` 类的 `<a>`；其余链接原样
  - [ ] SubTask 2.2: 保持现有 heading 锚点逻辑不变
- [ ] Task 3: 媒体与附件样式
  - [ ] SubTask 3.1: `ContentArea.css` 新增 `.md-body img`：max-width 100%、height auto、margin-top 14px、border-radius 4px、display block
  - [ ] SubTask 3.2: 新增 `.md-body video`：max-width 100%、height auto、display block、margin-top 14px
  - [ ] SubTask 3.3: 新增 `.md-body .md-file-link`：mono 小字（12–13px）、muted 色、hover 变 accent、前置 `↓`（可考虑 `.md-file-link::before { content: '↓ '; }`），与页面纯文字克制风格统一
- [ ] Task 4: 构建与运行验证
  - [ ] SubTask 4.1: `npm run build` 通过
  - [ ] SubTask 4.2: dev 验证：md 中插入一张占位图 + 一个假文件链接 + 一个视频标签（或用现有文章临时试），确认不破版、暗色协调、窄屏 OK；验证后清理临时内容

# Task Dependencies
- [Task 2] 依赖 [Task 1]（路径约定）
- [Task 3] 依赖 [Task 1]
- [Task 4] 依赖 [Task 2]、[Task 3]
