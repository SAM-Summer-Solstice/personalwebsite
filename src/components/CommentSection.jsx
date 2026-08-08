import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { getComments, addComment } from '../api.js'

// 评论时间格式化：YYYY-MM-DD HH:mm（mono 风格展示）
function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 自建评论区：加载评论列表；未登录显示登录入口，已登录可发表评论（成功后追加本地列表）
export default function CommentSection({ postId }) {
  const { user, openAuth } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 拉取评论列表（postId 即文章 slug，切换文章时重新拉取）
  useEffect(() => {
    if (!postId) return
    let alive = true
    setLoading(true)
    getComments(postId).then((data) => {
      if (!alive) return
      setComments(data || [])
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [postId])

  // 发表评论：成功后清空输入框并追加到列表尾部
  async function handleSubmit(e) {
    e.preventDefault()
    const text = content.trim()
    if (!text || submitting) return
    setSubmitting(true)
    const data = await addComment(postId, text)
    setSubmitting(false)
    if (data) {
      setComments((list) => [...list, data])
      setContent('')
    }
  }

  return (
    <section className="blog-comments" aria-label="评论">
      <h3 className="blog-comments-title mono">comments</h3>

      {loading ? (
        <p className="blog-comments-empty">评论加载中…</p>
      ) : comments.length === 0 ? (
        <p className="blog-comments-empty">还没有评论，来抢沙发吧。</p>
      ) : (
        <ul className="blog-comment-list">
          {comments.map((c) => (
            <li key={c.id} className="blog-comment">
              <div className="blog-comment-head">
                <span className="blog-comment-author">{c.author}</span>
                <span className="blog-comment-time mono">{formatTime(c.created_at)}</span>
              </div>
              <p className="blog-comment-content">{c.content}</p>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form className="blog-comment-form" onSubmit={handleSubmit}>
          <textarea
            className="blog-comment-input"
            placeholder="写下你的评论…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <button
            type="submit"
            className="blog-comment-submit"
            disabled={submitting || !content.trim()}
          >
            {submitting ? '提交中…' : '发表评论'}
          </button>
        </form>
      ) : (
        <div className="blog-comment-login">
          <span>登录后参与评论</span>
          <button type="button" className="blog-comment-login-btn" onClick={openAuth}>
            登录
          </button>
        </div>
      )}
    </section>
  )
}
