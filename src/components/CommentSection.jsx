import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { getComments, addComment, deleteComment } from '../api.js'

// 评论时间格式化：YYYY-MM-DD HH:mm（mono 风格展示）
function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 扁平评论列表 → 树：按 parent 分组，无父（或父缺失）的作为顶层；保持列表原有顺序
function buildTree(list) {
  const nodes = list.map((c) => ({ ...c, replies: [] }))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const roots = []
  nodes.forEach((n) => {
    const parent = n.parent != null ? byId.get(n.parent) : null
    if (parent) parent.replies.push(n)
    else roots.push(n)
  })
  return roots
}

// 收集某评论及其整棵回复子树的 id 集合（用于删除时一并移除）
function collectIds(comment, list) {
  const ids = [comment.id]
  list.forEach((c) => {
    if (c.parent != null && ids.includes(c.parent)) ids.push(c.id)
  })
  return ids
}

// 自建评论区：加载评论列表；未登录显示登录入口，已登录可发表顶层评论 / 回复 / 删除本人评论
export default function CommentSection({ postId }) {
  const { user, openAuth } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyTarget, setReplyTarget] = useState(null) // 展开回复表单的评论 id（null 表示收起）
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  // 拉取评论列表（postId 即文章 slug，切换文章时重新拉取）
  useEffect(() => {
    if (!postId) return
    let alive = true
    setLoading(true)
    setReplyTarget(null)
    setReplyText('')
    getComments(postId).then((data) => {
      if (!alive) return
      setComments(data || [])
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [postId])

  // 退出登录后收起可能残留的回复表单
  useEffect(() => {
    if (!user) {
      setReplyTarget(null)
      setReplyText('')
    }
  }, [user])

  // 发表顶层评论：成功后清空输入框并追加到列表尾部
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

  // 回复按钮：未登录先弹登录窗；已登录则切换该评论下的回复表单
  function toggleReply(c) {
    if (!user) {
      openAuth()
      return
    }
    if (replyTarget === c.id) {
      setReplyTarget(null)
      setReplyText('')
    } else {
      setReplyTarget(c.id)
      setReplyText('')
    }
  }

  // 提交回复：成功后把返回的评论对象追加进列表（会按 parent 自动嵌套），并收起表单
  async function handleReplySubmit(e, parent) {
    e.preventDefault()
    const text = replyText.trim()
    if (!text || replying) return
    setReplying(true)
    const data = await addComment(postId, text, parent.id)
    setReplying(false)
    if (data) {
      setComments((list) => [...list, data])
      setReplyTarget(null)
      setReplyText('')
    }
  }

  // 删除评论：确认后调 API，并把该评论及其整棵回复子树从本地状态移除
  async function handleDelete(c) {
    if (!window.confirm('确定删除这条评论及其回复吗？')) return
    await deleteComment(c.id)
    setComments((list) => {
      const ids = collectIds(c, list)
      return list.filter((x) => !ids.includes(x.id))
    })
  }

  // 递归渲染单条评论：内容 + 操作行 + 内联回复表单 + 嵌套回复
  function renderComment(c) {
    return (
      <li key={c.id} id={`comment-${c.id}`} className="blog-comment">
        <div className="blog-comment-head">
          <span className="blog-comment-author">{c.author}</span>
          <span className="blog-comment-time mono">{formatTime(c.created_at)}</span>
        </div>
        <p className="blog-comment-content">{c.content}</p>

        <div className="blog-comment-actions">
          <button type="button" className="blog-comment-action-btn" onClick={() => toggleReply(c)}>
            回复
          </button>
          {(c.is_mine || user?.is_staff) && (
            <button
              type="button"
              className="blog-comment-action-btn is-danger"
              onClick={() => handleDelete(c)}
            >
              删除
            </button>
          )}
        </div>

        {replyTarget === c.id && (
          <form className="blog-comment-reply-form" onSubmit={(e) => handleReplySubmit(e, c)}>
            <textarea
              className="blog-comment-input"
              placeholder={`回复 @${c.author}…`}
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="blog-comment-reply-actions">
              <button
                type="submit"
                className="blog-comment-submit"
                disabled={replying || !replyText.trim()}
              >
                {replying ? '提交中…' : '提交'}
              </button>
              <button
                type="button"
                className="blog-comment-action-btn"
                onClick={() => {
                  setReplyTarget(null)
                  setReplyText('')
                }}
              >
                取消
              </button>
            </div>
          </form>
        )}

        {c.replies.length > 0 && (
          <ul className="blog-comment-replies">{c.replies.map(renderComment)}</ul>
        )}
      </li>
    )
  }

  const tree = buildTree(comments)

  return (
    <section className="blog-comments" aria-label="评论">
      <h3 className="blog-comments-title mono">comments</h3>

      {loading ? (
        <p className="blog-comments-empty">评论加载中…</p>
      ) : tree.length === 0 ? (
        <p className="blog-comments-empty">还没有评论，来抢沙发吧。</p>
      ) : (
        <ul className="blog-comment-list">{tree.map(renderComment)}</ul>
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
