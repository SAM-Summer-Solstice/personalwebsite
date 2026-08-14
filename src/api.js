// 内容 API 封装：所有请求走 /api 前缀（dev 由 Vite 代理到 Django :8000）。
// fail-open 语义：请求失败 / 非 2xx 一律返回 null，由调用方降级处理，绝不抛异常。
const BASE = '/api'

// JWT access token 的 localStorage 键名
const TOKEN_KEY = 'blog_token'

// 会话失效（401）时广播的事件名：api 层清除本地 token，AuthContext 监听后重置用户态并唤起登录
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

// 读取本地保存的 access token（未登录返回 null）
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

// 保存 / 清除 access token：传 null 或空值即清除
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

// 任一请求收到 401（token 过期 / 失效）：清除本地 token 并广播，由 AuthContext 重置用户态
export function notifyUnauthorized() {
  setToken(null)
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
}

// 已登录时给请求附带 Authorization: Bearer <token>，未登录返回空对象
function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// 后端返回的媒体资源是相对路径（/media/...），拼当前 origin；已是绝对 URL 则原样返回
export function resolveMediaUrl(u) {
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  return window.location.origin + (u.startsWith('/') ? u : `/${u}`)
}

async function request(path, options) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options?.headers || {}),
    }
    const res = await fetch(BASE + path, {
      ...options,
      headers,
    })
    // 仅当本次请求实际携带了 Authorization 头时，401 才视为会话失效：
    // 避免登录接口输错密码等「未携带 token 的 401」误清掉已有登录态。
    if (res.status === 401 && headers.Authorization) {
      notifyUnauthorized()
      return null
    }
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// 带错误详情的请求：返回 { ok, status, data, detail }，用于需要把服务端
// 提示（禁言文案 / 限频提示 / 校验错误）原样展示给用户的写操作
async function requestDetailed(path, options) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options?.headers || {}),
    }
    const res = await fetch(BASE + path, {
      ...options,
      headers,
    })
    if (res.status === 401 && headers.Authorization) {
      notifyUnauthorized()
      return { ok: false, status: 401, detail: '登录已过期，请重新登录' }
    }
    if (!res.ok) {
      let detail = null
      try {
        detail = (await res.json())?.detail || null
      } catch {
        /* 无响应体 */
      }
      return { ok: false, status: res.status, detail }
    }
    return { ok: true, status: res.status, data: await res.json() }
  } catch {
    return { ok: false, status: 0, detail: '网络异常，请稍后再试' }
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

// 注册用户墙（用户名 + 真实评论数）
export function getUsers() {
  return request('/users/')
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

// 登录/注册带详情版本：失败时返回 { ok:false, detail }，用于弹窗展示服务端提示
export function loginDetailed(data) {
  return requestDetailed('/token/', { method: 'POST', body: JSON.stringify(data) })
}
export function registerDetailed(data) {
  return requestDetailed('/register/', { method: 'POST', body: JSON.stringify(data) })
}

// 用户个人主页（公开资料 + 近期评论）
export function getUserProfile(username) {
  return request(`/users/${encodeURIComponent(username)}/`)
}

// 请求密码重置验证码（发送到邮箱；未注册邮箱同样返回 200）
export function requestPasswordReset(email) {
  return request('/password-reset/request/', { method: 'POST', body: JSON.stringify({ email }) })
}

// 校验验证码 + 新密码，完成密码重置（失败返回 null）
export function confirmPasswordReset(email, code, newPassword) {
  return request('/password-reset/confirm/', {
    method: 'POST',
    body: JSON.stringify({ email, code, new_password: newPassword }),
  })
}

// 当前登录用户信息（需已登录；未登录 / token 失效返回 null）
export function getMe() {
  return request('/me/')
}

// 更新当前用户资料（需登录；返回更新后的 me，校验失败返回 null）
export function updateMe(data) {
  return request('/me/', { method: 'PATCH', body: JSON.stringify(data) })
}

// 上传/更换头像（需登录；multipart/form-data，file 为图片，后端限制 2MB；成功返回 {avatar}）
export function uploadAvatar(file) {
  return new Promise((resolve) => {
    const fd = new FormData()
    fd.append('file', file)
    fetch(BASE + '/me/avatar/', {
      method: 'POST',
      headers: { ...authHeaders() },
      body: fd,
    })
      .then((res) => {
        if (res.status === 401) {
          notifyUnauthorized()
          return null
        }
        return res.ok ? res.json() : null
      })
      .then(resolve)
      .catch(() => resolve(null))
  })
}

// 通知列表（需登录；返回 {list, unread_count}）
export function getNotifications() {
  return request('/notifications/')
}

// 全部通知标记已读（需登录）
export function markNotificationsRead() {
  return request('/notifications/read/', { method: 'POST' })
}

// 单条通知标记已读（需登录）
export function markNotificationRead(id) {
  return request(`/notifications/${id}/read/`, { method: 'POST' })
}

// 文章评论列表（未登录也可读）
export function getComments(postId) {
  return request(`/posts/${postId}/comments/`)
}

// 发表评论（需登录；成功返回新评论对象；parentId 为回复目标评论 id，可为 null 表示顶层评论）
export function addComment(postId, content, parentId) {
  return request(`/posts/${postId}/comments/`, {
    method: 'POST',
    body: JSON.stringify({ content, parent_id: parentId || null }),
  })
}

// 发表评论（带详情版）：被禁言/限频时返回 { ok:false, detail: 提示文案 }
export function addCommentDetailed(postId, content, parentId) {
  return requestDetailed(`/posts/${postId}/comments/`, {
    method: 'POST',
    body: JSON.stringify({ content, parent_id: parentId || null }),
  })
}

// 删除评论（需登录且仅本人 / 管理员；DELETE 204 无返回体，成功 / 失败均为 null，调用方本地移除即可）
export function deleteComment(id) {
  return request(`/comments/${id}/`, { method: 'DELETE' })
}

// 切换点赞（需登录；返回 {likes, liked}）
export function toggleLike(postId) {
  return request(`/posts/${postId}/like/`, { method: 'POST' })
}

// 切换评论点赞（需登录；返回 {likes, liked}）
export function toggleCommentLike(commentId) {
  return request(`/comments/${commentId}/like/`, { method: 'POST' })
}

// 举报评论（需登录；带详情版返回 { ok, detail }，成功后评论自动隐藏待复核）
export function reportComment(commentId, reason) {
  return requestDetailed(`/comments/${commentId}/report/`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || '' }),
  })
}

// 切换文章收藏（需登录；返回 {favorited}）
export function toggleFavorite(postId) {
  return request(`/posts/${postId}/favorite/`, { method: 'POST' })
}

// 我的收藏列表（需登录；返回 [{slug,title,date,created_at}]）
export function getFavorites() {
  return request('/favorites/')
}
