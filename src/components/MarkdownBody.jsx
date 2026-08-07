import { useEffect, useMemo, useRef } from 'react'
import { marked } from 'marked'

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

    const result = marked.parse(markdown, { renderer })
    headingsRef.current = headings
    return result
  }, [postId, markdown])

  useEffect(() => {
    if (onHeadings) onHeadings(headingsRef.current)
  }, [html, onHeadings])

  return <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
}
