# 内容附件支持（Content Attachments）Spec

## Why
当前内容管线（`content/*.md` → marked 渲染）只适合纯文本：`![alt](src)` 的图片路径不会经过 Vite 处理，相对路径会 404；`.md-body` 没有 img/video 样式，宽图与视频会溢出、窄屏破版。未来文章/项目还会引用 PDF、Word、MP4 等格式文件，需要一套统一的"附件约定 + 展示样式"，让用户只写 Markdown 就能可靠地嵌入图片、链接文件、内嵌视频，且暗色协调、移动端自适应、不破版。

## What Changes
- **附件目录约定**：新建 `public/images/`（图片）、`public/files/`（pdf/docx/xlsx/zip 等文档与压缩包）、`public/media/`（mp4/webm 等视频），各放 `.gitkeep` 保留空目录；md 中一律用绝对路径引用（`/images/x.png`、`/files/x.pdf`、`/media/x.mp4`）
- **图片展示**：`.md-body img` 响应式（`max-width:100%; height:auto`、留白、小圆角、暗色协调）
- **视频展示**：`.md-body video` 响应式（`max-width:100%; display:block`、留白），md 内用原生 `<video controls src="/media/x.mp4">` 内嵌
- **文件链接样式**：`MarkdownBody` 的 marked renderer 重写 `link`——href 命中附件扩展名（.pdf/.docx/.doc/.xlsx/.zip/.mp4/.mov/.webm 等）时附加 `md-file-link` 类；`.md-body .md-file-link` 采用克制样式（mono 小字、muted、hover 变 accent、前置 `↓` 提示可下载/打开）
- **保持克制**：不做上传后台、不做附件管理界面；附件 = "往 public 丢文件 + md 写引用"

## Impact
- Affected specs: `content-management`（内容管线基础）、`differentiate-content-pages`（帖子/项目正文）
- Affected code:
  - `src/components/MarkdownBody.jsx`（renderer 增加 `link` 重写，附件链接附加类）
  - `src/components/ContentArea.css`（`.md-body img` / `.md-body video` / `.md-body .md-file-link` 样式）
  - `public/`（新增 images / files / media 目录与 .gitkeep）

## ADDED Requirements

### Requirement: 图片嵌入
系统 SHALL 让 md 中以绝对路径引用的图片按响应式样式显示。

#### Scenario: 文章插图
- **WHEN** md 中写 `![示意图](/images/demo.png)`
- **THEN** 图片自适应容器宽度、保持比例、窄屏不溢出，暗色背景下视觉协调

### Requirement: 文件附件链接
系统 SHALL 让 md 中对常见文档/媒体格式的链接以附件样式呈现。

#### Scenario: 文档附件
- **WHEN** md 中写 `[规格书.pdf](/files/spec.pdf)`
- **THEN** 渲染为带 `md-file-link` 类的链接，样式克制（mono 小字、muted、hover accent、前置 ↓），点击可打开/下载

### Requirement: 视频内嵌
系统 SHALL 支持 md 中内嵌视频并以响应式样式显示。

#### Scenario: 演示视频
- **WHEN** md 中写 `<video controls src="/media/demo.mp4"></video>`
- **THEN** 视频自适应宽度、窄屏不破版、带原生播放控件

### Requirement: 附件目录约定
系统 SHALL 提供 `public/images`、`public/files`、`public/media` 三个附件目录（含 `.gitkeep`），并约定绝对路径引用。

## MODIFIED Requirements

### Requirement: Markdown 渲染器
`MarkdownBody` 的 marked renderer 在既有 heading 锚点基础上，增加 `link` 重写：附件扩展名 href 附加 `md-file-link` 类，其余链接行为不变。

### Requirement: 正文排版样式
`.md-body` 排版从纯文本扩展到媒体元素（img/video/附件链接），保持暗色与窄屏不破版。

## REMOVED Requirements

无（相对路径图片本就不支持，不属既有能力；不新增对相对路径的兼容）。
