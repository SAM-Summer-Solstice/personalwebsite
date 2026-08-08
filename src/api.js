// 内容 API 封装：所有请求走 /api 前缀（dev 由 Vite 代理到 Django :8000）。
// fail-open 语义：请求失败 / 非 2xx 一律返回 null，由调用方降级处理，绝不抛异常。
const BASE = '/api'

async function request(path, options) {
  try {
    const res = await fetch(BASE + path, options)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// 文章列表（按日期倒序，无 content 正文）
export function getPosts() {
  return request('/posts/')
}

// 单篇文章详情（含 content Markdown 正文）
export function getPost(id) {
  return request(`/posts/${id}/`)
}

// 项目列表
export function getProjects() {
  return request('/projects/')
}

// 关于页数据
export function getAbout() {
  return request('/about/')
}

// 浏览量 +1（会话内一次，由调用方守卫；列表浏览量直接来自 GET /api/posts/，无需单独查询）
export function incrementViews(id) {
  return request(`/views/${id}/`, { method: 'POST' })
}
