// 内容 API 封装：所有请求走 /api 前缀（dev 由 Vite 代理到 Django :8000）。
// fail-open 语义：请求失败 / 非 2xx 一律返回 null，由调用方降级处理，绝不抛异常。
const BASE = '/api'

// JWT access token 的 localStorage 键名
const TOKEN_KEY = 'blog_token'

// 读取本地保存的 access token（未登录返回 null）
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

// 保存 / 清除 access token：传 null 或空值即清除
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

// 已登录时给请求附带 Authorization: Bearer <token>，未登录返回空对象
function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function request(path, options) {
  try {
    const res = await fetch(BASE + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(options?.headers || {}),
      },
    })
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

// 注册新用户（成功返回 {id, username}；失败返回 null）
export function register(data) {
  return request('/register/', { method: 'POST', body: JSON.stringify(data) })
}

// 登录（成功返回 {access, refresh}，由调用方 setToken(access) 保存）
export function login(data) {
  return request('/token/', { method: 'POST', body: JSON.stringify(data) })
}

// 当前登录用户信息（需已登录；未登录 / token 失效返回 null）
export function getMe() {
  return request('/me/')
}

// 文章评论列表（未登录也可读）
export function getComments(postId) {
  return request(`/posts/${postId}/comments/`)
}

// 发表评论（需登录；成功返回新评论对象）
export function addComment(postId, content) {
  return request(`/posts/${postId}/comments/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

// 切换点赞（需登录；返回 {likes, liked}）
export function toggleLike(postId) {
  return request(`/posts/${postId}/like/`, { method: 'POST' })
}
