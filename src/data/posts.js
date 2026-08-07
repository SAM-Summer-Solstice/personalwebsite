// 文章数据加载层：读取 content/posts/*.md，解析 frontmatter 与正文。
// 新增/修改文章 = 在 content/posts/ 下增删改 Markdown 文件（git 提交即可）。
import { parseFrontmatter } from './frontmatter.js'

const files = import.meta.glob('/content/posts/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

export const posts = Object.entries(files)
  .map(([path, raw]) => {
    const { fm, body } = parseFrontmatter(raw, path)
    const required = ['id', 'title', 'date', 'tags', 'excerpt', 'views', 'likes', 'comments']
    for (const k of required) {
      if (!(k in fm)) throw new Error(`文章 ${path} 缺少必需字段：${k}`)
    }
    return {
      id: fm.id,
      title: fm.title,
      date: fm.date,
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      excerpt: fm.excerpt,
      views: Number(fm.views) || 0,
      likes: Number(fm.likes) || 0,
      comments: Array.isArray(fm.comments) ? fm.comments : [],
      content: body, // Markdown 原文，由 MarkdownBody 渲染
    }
  })
  .sort((a, b) => b.date.localeCompare(a.date))
