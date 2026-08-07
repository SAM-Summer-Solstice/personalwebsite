// 项目数据加载层：读取 content/projects/*.md，解析 frontmatter。
// 新增/修改项目 = 在 content/projects/ 下增删改 Markdown 文件（git 提交即可）。
import { parseFrontmatter } from './frontmatter.js'

const files = import.meta.glob('/content/projects/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

export const projects = Object.entries(files).map(([path, raw]) => {
  const { fm } = parseFrontmatter(raw, path)
  const required = ['id', 'name', 'emoji', 'tagline', 'description', 'tech', 'status', 'date']
  for (const k of required) {
    if (!(k in fm)) throw new Error(`项目 ${path} 缺少必需字段：${k}`)
  }
  return {
    id: fm.id,
    name: fm.name,
    emoji: fm.emoji,
    tagline: fm.tagline,
    description: fm.description,
    tech: Array.isArray(fm.tech) ? fm.tech : [],
    status: fm.status,
    date: fm.date,
    url: fm.url || '',
    github: fm.github || '',
    related: Array.isArray(fm.related) ? fm.related : [],
  }
})
