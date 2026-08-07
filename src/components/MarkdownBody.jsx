import { useEffect, useMemo, useRef } from 'react'
import { marked } from 'marked'

// 工科主流文件格式 → 展示类别：code（代码/脚本/配置）/ doc（文档/表格/演示/文本）/
// model（3D/CAD/仿真/科学数据/嵌入式固件）/ media（图片/音视频）/ other（压缩包/可执行）
const FILE_CATS = {
  // code
  py: 'code', c: 'code', cpp: 'code', cxx: 'code', cc: 'code', h: 'code', hpp: 'code',
  hxx: 'code', java: 'code', js: 'code', ts: 'code', jsx: 'code', tsx: 'code', go: 'code',
  rs: 'code', swift: 'code', sh: 'code', bash: 'code', zsh: 'code', bat: 'code', ps1: 'code',
  m: 'code', ino: 'code', ipynb: 'code', html: 'code', css: 'code', json: 'code', xml: 'code',
  yaml: 'code', yml: 'code', toml: 'code', ini: 'code', cfg: 'code', sql: 'code', asm: 'code',
  s: 'code', lua: 'code', r: 'code', dart: 'code', kt: 'code',
  // doc
  pdf: 'doc', doc: 'doc', docx: 'doc', ppt: 'doc', pptx: 'doc', xls: 'doc', xlsx: 'doc',
  odt: 'doc', ods: 'doc', odp: 'doc', txt: 'doc', md: 'doc', tex: 'doc', rtf: 'doc',
  // model（3D/CAD/仿真/科学数据/嵌入式）
  stl: 'model', obj: 'model', fbx: 'model', gltf: 'model', glb: 'model', ply: 'model',
  off: 'model', '3mf': 'model', step: 'model', stp: 'model', iges: 'model', igs: 'model',
  dxf: 'model', dwg: 'model', sldprt: 'model', sldasm: 'model', x_t: 'model', brep: 'model',
  sat: 'model', vtk: 'model', urdf: 'model', sdf: 'model', launch: 'model', bag: 'model',
  csv: 'model', tsv: 'model', dat: 'model', npy: 'model', npz: 'model', h5: 'model',
  hdf5: 'model', pkl: 'model', pickle: 'model', onnx: 'model', pt: 'model', pth: 'model',
  parquet: 'model', mat: 'model', hex: 'model', bin: 'model', elf: 'model', o: 'model',
  a: 'model', so: 'model', lib: 'model',
  // media
  jpg: 'media', jpeg: 'media', png: 'media', gif: 'media', webp: 'media', svg: 'media',
  bmp: 'media', tif: 'media', tiff: 'media', mp4: 'media', mov: 'media', webm: 'media',
  mkv: 'media', avi: 'media', mp3: 'media', wav: 'media', flac: 'media', ogg: 'media',
  aac: 'media', m4a: 'media',
  // other（压缩包/可执行/安装）
  zip: 'other', rar: 'other', '7z': 'other', tar: 'other', gz: 'other', bz2: 'other',
  xz: 'other', deb: 'other', rpm: 'other', apk: 'other', iso: 'other', img: 'other',
  exe: 'other', dll: 'other',
}

const FILE_EXT = new Set(Object.keys(FILE_CATS))

// 递归提取内联 token 的纯文本（用于 TOC 显示，忽略加粗/斜体等标记）
function inlineText(tokens) {
  let out = ''
  for (const t of tokens) {
    out += t.text ?? (t.tokens ? inlineText(t.tokens) : '')
  }
  return out
}

// Markdown 正文渲染：marked 生成 HTML，h2 自动带锚点 id（${postId}-sec-N），
// 并把 { id, text, index } 通过 onHeadings 暴露给父组件做 TOC。
export default function MarkdownBody({ postId, markdown, onHeadings }) {
  const headingsRef = useRef([])
  const html = useMemo(() => {
    const renderer = new marked.Renderer()
    const headings = []
    let num = 0

    renderer.heading = function ({ tokens, depth }) {
      const content = this.parser.parseInline(tokens)
      if (depth === 2) {
        num += 1
        const id = `${postId}-sec-${num}`
        headings.push({ id, text: inlineText(tokens), index: num })
        return `<h2 id="${id}">${content}</h2>\n`
      }
      return `<h${depth}>${content}</h${depth}>\n`
    }

    // 附件链接：命中工科格式时附加 md-file-link 类，携带 data-ext 与 data-cat（终端文件风格 + 类别着色），其余链接行为不变
    renderer.link = function ({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens)
      const t = title ? ` title="${title}"` : ''
      const extMatch = href.match(/\.([a-z0-9_]{1,8})$/i)
      const ext = extMatch?.[1].toLowerCase()
      const cat = ext ? FILE_CATS[ext] : undefined
      if (cat) {
        return `<a href="${href}"${t} class="md-file-link" data-ext="${ext}" data-cat="${cat}">${text}</a>\n`
      }
      return `<a href="${href}"${t}>${text}</a>\n`
    }

    // 图片：清理 alt 中的 markdown 标记，并懒加载；包 figure 容器以支持 reveal + 视差
    renderer.image = function ({ href, title, text }) {
      const alt = (text || '').replace(/[\\`*_[\]{}]/g, '')
      const t = title ? ` title="${title}"` : ''
      return `<figure class="md-figure"><img src="${href}"${t} alt="${alt}" loading="lazy" /></figure>\n`
    }

    const result = marked.parse(markdown, { renderer })
    headingsRef.current = headings
    return result
  }, [postId, markdown])

  useEffect(() => {
    if (onHeadings) onHeadings(headingsRef.current)
  }, [html, onHeadings])

  return <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
}
