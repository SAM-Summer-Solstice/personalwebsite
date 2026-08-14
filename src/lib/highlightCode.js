// 代码高亮（Prism 按需加载）：仅在正文含代码块时动态导入 Prism 与语言组件，
// 不增加首屏打包体积；核桃派上也只是静态文件服务，无服务端开销。
let prismPromise = null

function loadPrism() {
  if (!prismPromise) {
    prismPromise = (async () => {
      const Prism = (await import('prismjs')).default
      await import('prismjs/themes/prism-tomorrow.css')
      // 工科博客常见语言；组件自带别名（py/shell/html 等）。
      // 注意必须写死静态导入列表：Vite 不解析带模板变量的动态导入
      await Promise.all([
        import('prismjs/components/prism-python.js'),
        import('prismjs/components/prism-c.js'),
        import('prismjs/components/prism-cpp.js'),
        import('prismjs/components/prism-javascript.js'),
        import('prismjs/components/prism-typescript.js'),
        import('prismjs/components/prism-bash.js'),
        import('prismjs/components/prism-json.js'),
        import('prismjs/components/prism-markup.js'),
        import('prismjs/components/prism-css.js'),
        import('prismjs/components/prism-java.js'),
        import('prismjs/components/prism-sql.js'),
        import('prismjs/components/prism-yaml.js'),
        import('prismjs/components/prism-go.js'),
        import('prismjs/components/prism-rust.js'),
      ])
      return Prism
    })()
  }
  return prismPromise
}

/**
 * 对容器内的代码块做语法高亮（幂等：已高亮的跳过）。
 * 语言来自渲染器输出的 class="language-xxx"（Prism 按别名匹配，未识别时保持原样）。
 */
export async function highlightCodeBlocks(root) {
  if (!root) return
  const codes = root.querySelectorAll('pre code[class*="language-"]')
  if (!codes.length) return
  try {
    const Prism = await loadPrism()
    codes.forEach((el) => {
      if (el.dataset.highlighted) return
      try {
        Prism.highlightElement(el)
        el.dataset.highlighted = '1'
      } catch {
        /* 不识别语言时保持原样 */
      }
    })
  } catch {
    /* 高亮失败不影响阅读 */
  }
}
