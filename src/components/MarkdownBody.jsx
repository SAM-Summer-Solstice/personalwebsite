import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { highlightCodeBlocks } from '../lib/highlightCode.js'

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
// 公式（$…$ / $$…$$）：先暂存为占位符再走 marked + DOMPurify，最后动态加载 KaTeX 渲染回填，
// 仅当正文含公式时才下载 KaTeX（约 300KB），普通文章零开销。
export default function MarkdownBody({ postId, markdown, onHeadings }) {
  const headingsRef = useRef([])
  const bodyRef = useRef(null)
  const [mathHtml, setMathHtml] = useState(null)
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

    // 代码块：带语言标记 + 复制按钮（md-code-block 包一层头部），
    // 复制事件通过正文上的事件委托处理（见下方 copy 监听），避免在 HTML 内联 JS
    renderer.code = function ({ text, lang }) {
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const langName = (lang || '').trim().replace(/[^\w+#.-]/g, '')
      const safeLang = langName ? ` class="language-${langName}"` : ''
      const label = langName ? `<span class="md-code-lang">${langName}</span>` : '<span class="md-code-lang">text</span>'
      return `<div class="md-code-block"><div class="md-code-head">${label}<button type="button" class="md-copy-btn" data-copied="false">复制</button></div><pre><code${safeLang}>${escaped}</code></pre></div>\n`
    }

    // 图片 / 视频：视频扩展名（mp4/webm/ogg/mov）输出 <video>（保留 md-video 类样式），
    // 其余保持图片逻辑：清理 alt 中的 markdown 标记，懒加载，包 figure 容器以支持 reveal + 视差
    renderer.image = function ({ href, title, text }) {
      if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(href)) {
        return `<video class="md-video" controls preload="metadata"><source src="${href}"></video>\n`
      }
      const alt = (text || '').replace(/[\\`*_[\]{}]/g, '')
      const t = title ? ` title="${title}"` : ''
      return `<figure class="md-figure"><img src="${href}"${t} alt="${alt}" loading="lazy" /></figure>\n`
    }

    // 公式暂存：$$…$$ 块级公式与 $…$ 行内公式先替换为占位符，
    // 避免 marked/DOMPurify 处理 LaTeX 反斜杠与特殊字符时破坏内容
    const stash = []
    let src = typeof markdown === 'string' ? markdown : ''
    src = src.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) => {
      stash.push({ tex, display: true })
      return `\n\n@@MATH${stash.length - 1}@@\n\n`
    })
    src = src.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (m, tex) => {
      stash.push({ tex, display: false })
      return `@@MATH${stash.length - 1}@@`
    })

    // 防御：内容缺失 / marked 渲染异常时降级为转义纯文本（经 DOMPurify 消毒），
    // 绝不让异常导致单篇白屏（fail-open，与 api.js 语义一致）
    let rendered
    try {
      rendered = marked.parse(src, { renderer })
    } catch {
      const esc = String(markdown ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      rendered = `<pre>${esc}</pre>`
    }

    const clean = DOMPurify.sanitize(rendered)
    headingsRef.current = headings
    return { html: clean, stash }
  }, [postId, markdown])

  // 公式渲染：正文含公式时动态加载 KaTeX（含样式）并回填占位符；
  // 无公式的文章不触发任何 KaTeX 下载（零开销）
  useEffect(() => {
    if (!html.stash.length) {
      setMathHtml(null)
      return
    }
    let alive = true
    import('katex')
      .then(async ({ default: katex }) => {
        await import('katex/dist/katex.min.css')
        let out = html.html
        html.stash.forEach((s, i) => {
          let r
          try {
            r = katex.renderToString(s.tex, { throwOnError: false, displayMode: s.display })
          } catch {
            r = s.tex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          }
          out = out.split(`@@MATH${i}@@`).join(r)
        })
        if (alive) setMathHtml(out)
      })
      .catch(() => {
        if (alive) setMathHtml(html.html)
      })
    return () => {
      alive = false
    }
  }, [html])

  // 代码高亮：正文含代码块时按需加载 Prism（幂等，语言未识别时保持原样）
  useEffect(() => {
    highlightCodeBlocks(bodyRef.current)
  }, [finalHtmlSafe(html, mathHtml)])

  useEffect(() => {
    if (onHeadings) onHeadings(headingsRef.current)
  }, [html, onHeadings])

  // 代码块复制：事件委托（按钮由 dangerouslySetInnerHTML 注入，无法直接绑定 React 事件）
  useEffect(() => {
    const root = bodyRef.current
    if (!root) return

    const copyCode = async (button) => {
      const block = button.closest('.md-code-block')
      const codeEl = block?.querySelector('code')
      if (!codeEl) return
      const rawText = codeEl.textContent || ''
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(rawText)
        } else {
          const ta = document.createElement('textarea')
          ta.value = rawText
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        flashCopied(button)
      } catch {
        flashCopied(button)
      }
    }

    const flashCopied = (button) => {
      button.textContent = '已复制'
      button.setAttribute('data-copied', 'true')
      setTimeout(() => {
        button.textContent = '复制'
        button.setAttribute('data-copied', 'false')
      }, 1600)
    }

    const onClick = (e) => {
      const btn = e.target.closest ? e.target.closest('.md-copy-btn') : null
      if (btn) copyCode(btn)
    }

    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [finalHtmlSafe(html, mathHtml)])

  const finalHtml = mathHtml ?? html.html
  return <div className="md-body" ref={bodyRef} dangerouslySetInnerHTML={{ __html: finalHtml }} />
}

// 渲染 HTML 当前值（公式回填优先，未回填用占位版）——effects 依赖此值
function finalHtmlSafe(html, mathHtml) {
  return mathHtml ?? html.html
}
