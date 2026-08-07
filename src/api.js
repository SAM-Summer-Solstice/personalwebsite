// 浏览量 API 封装：请求失败返回 null，由调用方降级显示 frontmatter mock 数。
const BASE = ''

async function request(path, options) {
  try {
    const res = await fetch(BASE + path, options)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function getViews(id) {
  return request(`/api/views/${id}`)
}

export function incrementViews(id) {
  return request(`/api/views/${id}`, { method: 'POST' })
}
