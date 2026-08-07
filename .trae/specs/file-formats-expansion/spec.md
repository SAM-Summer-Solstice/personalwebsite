# 工科主流文件格式全覆盖（File Formats Expansion）Spec

## Why
`content-attachments` 的附件链接目前只覆盖约 20 种扩展名（pdf/docx/zip/mp4 等），PPT、JPG、PY、CPP、C、STL、IPYNB、MAT 等工科学生常用的文档、代码、数据、3D/CAD、嵌入式、脚本、压缩格式都不在列——这些格式在 md 中写链接时会退回普通链接样式，没有附件形态与视觉区分。需要把工科主流格式全部纳入附件设计，并按类别着色，让不同文件类型一眼可辨且保持克制高级感。

## What Changes
- **扩展 `FILE_EXT` 正则**：覆盖工科主流格式——文档（pdf/doc/docx/ppt/pptx/xls/xlsx/odt/ods/odp/txt/md/tex/rtf）、代码与脚本（py/c/cpp/cxx/cc/h/hpp/hxx/java/js/ts/go/rs/swift/sh/bat/ps1/m/ino/ipynb/html/css/json/xml/yaml/toml/sql/asm/s/lua/r/dart/kt）、科学数据（csv/tsv/dat/npy/npz/h5/hdf5/pkl/pickle/onnx/pt/pth/parquet/mat）、3D/CAD/仿真（stl/obj/fbx/gltf/glb/ply/off/3mf/step/stp/iges/igs/dxf/dwg/sldprt/sldasm/x_t/brep/sat/vtk/urdf/sdf/launch/bag）、嵌入式与可执行（hex/bin/elf/o/a/so/dll/exe/lib）、压缩与安装包（zip/rar/7z/tar/gz/bz2/xz/deb/rpm/apk/iso/img）、媒体（jpg/jpeg/png/gif/webp/svg/bmp/tif/tiff/mp4/mov/webm/mkv/avi/mp3/wav/flac/ogg/aac/m4a）
- **扩展名提取放宽**：`data-ext` 正则由 `{2,5}` 放宽为 `{2,8}`（容纳 sldprt/sldasm/parquet/ipynb 等长扩展名）
- **类别着色**：renderer 为附件链接生成 `data-cat`（code / doc / model / media / other），CSS 按类别给扩展名标签着色：代码→紫（--accent）、文档→青（--accent-2）、模型/数据/媒体/其他→灰（--text-muted）；hover 全部变 accent
- **图片格式**：jpg/png/gif/webp/svg 等图片扩展名保留在附件链接判定之外（图片走 `![]()` 语法渲染为响应式图）；若用户写成 `[图](/images/x.jpg)` 链接形式，则落入附件行（灰）
- **保持克制**：不新增配色体系、不引入依赖、不改变既有图片/视频/普通链接样式

## Impact
- Affected specs: `content-attachments`（附件机制基础，本次扩展格式与类别）
- Affected code:
  - `src/components/MarkdownBody.jsx`（FILE_EXT 常量、data-ext 正则、renderer.link 生成 data-cat）
  - `src/components/ContentArea.css`（.md-file-link 类别着色规则）

## ADDED Requirements

### Requirement: 工科格式全覆盖
系统 SHALL 将工科学生常用的文档、代码、科学数据、3D/CAD、嵌入式、压缩、媒体格式均识别为附件链接。

#### Scenario: 各类格式引用
- **WHEN** md 中写 `[源码.py](/files/main.py)`、`[模型.stl](/files/part.stl)`、`[报告.pptx](/files/报告.pptx)`、`[数据.ipynb](/files/demo.ipynb)` 等
- **THEN** 均渲染为 `md-file-link` 附件行，显示 `[ext] 文件名 ↓`

### Requirement: 类别着色
系统 SHALL 按文件类别给扩展名标签着色，便于快速区分文件类型。

#### Scenario: 类别色
- **WHEN** 附件扩展名属于 code / doc / model / media / other
- **THEN** 扩展名标签分别显示对应类别色：代码紫、文档青、其余灰；悬停时整行变 accent

### Requirement: 长扩展名
系统 SHALL 正确提取最长 8 字符的扩展名（如 sldprt、sldasm、parquet、ipynb）。

## MODIFIED Requirements

### Requirement: 附件链接渲染
`FILE_EXT` 由约 20 种扩展为工科主流全格式；`renderer.link` 在输出 `data-ext` 的同时输出 `data-cat` 类别，供 CSS 着色。

### Requirement: 附件链接样式
`.md-file-link` 保持终端文件风格 `[ext] 文件名 ↓`，新增按 `data-cat` 的扩展名标签着色。

## REMOVED Requirements

无（既有附件行为全部保留，仅扩展格式与着色）。
