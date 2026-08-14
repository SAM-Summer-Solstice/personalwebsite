import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  getComments,
  addCommentDetailed,
  deleteComment,
  toggleCommentLike,
  reportComment,
  resolveMediaUrl,
} from '../api.js'

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
// onCountChange：评论列表加载/增/删后回传真实评论总数（含回复），供帖子信息行同步展示
export default function CommentSection({ postId, onCountChange }) {
  const { user, openAuth } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyTarget, setReplyTarget] = useState(null) // 展开回复表单的评论 id（null 表示收起）
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  // 发表/回复被拒时的服务端提示（禁言 / 限频文案）
  const [submitError, setSubmitError] = useState('')
  // 中性提示（举报成功、评论待审核等）
  const [notice, setNotice] = useState('')
  // 已展开回复的评论 id 集合：默认每条评论只展示第一条回复，点击小三角展开其余
  const [expanded, setExpanded] = useState(() => new Set())

  // 拉取评论列表（postId 即文章 slug，切换文章时重新拉取）
  useEffect(() => {
    if (!postId) return
    let alive = true
    setLoading(true)
    setReplyTarget(null)
    setReplyText('')
    setExpanded(new Set())
    getComments(postId).then((data) => {
      if (!alive) return
      setComments(data || [])
      setLoading(false)
      onCountChange?.(data?.length ?? 0)
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

  // 发表顶层评论：成功后清空输入框并追加到列表尾部；被拒（禁言/限频）展示服务端提示；
  // 进审核队列（is_approved=false）的评论同样本地展示，但带「审核中」标记并给出提示
  async function handleSubmit(e) {
    e.preventDefault()
    const text = content.trim()
    if (!text || submitting) return
    setSubmitting(true)
    setSubmitError('')
    setNotice('')
    const res = await addCommentDetailed(postId, text)
    setSubmitting(false)
    if (res?.ok && res.data) {
      const next = [...comments, res.data]
      setComments(next)
      setContent('')
      onCountChange?.(next.length)
      if (!res.data.is_approved) setNotice('评论已提交，审核通过后展示')
    } else {
      setSubmitError(res?.detail || '发表失败，请稍后再试')
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
    setSubmitError('')
    setNotice('')
    const res = await addCommentDetailed(postId, text, parent.id)
    setReplying(false)
    if (res?.ok && res.data) {
      const next = [...comments, res.data]
      setComments(next)
      setReplyTarget(null)
      setReplyText('')
      onCountChange?.(next.length)
      if (!res.data.is_approved) setNotice('回复已提交，审核通过后展示')
    } else {
      setSubmitError(res?.detail || '回复失败，请稍后再试')
    }
  }

  // 点赞/取消点赞评论（未登录先弹登录窗），成功后同步服务端结果
  async function handleLikeComment(c) {
    if (!user) {
      openAuth()
      return
    }
    const data = await toggleCommentLike(c.id)
    if (data && typeof data.likes === 'number') {
      setComments((list) =>
        list.map((x) => (x.id === c.id ? { ...x, likes: data.likes, liked: data.liked } : x))
      )
    }
  }

  // 举报评论（未登录先弹登录窗）：首个举报成功后该评论自动隐藏待复核，本地同步移除
  async function handleReport(c) {
    if (!user) {
      openAuth()
      return
    }
    const reason = window.prompt('举报理由（可选）')
    if (reason === null) return
    const res = await reportComment(c.id, reason || '')
    if (res?.ok) {
      const ids = collectIds(c, comments)
      const next = comments.filter((x) => !ids.includes(x.id))
      setComments(next)
      onCountChange?.(next.length)
      setNotice('已举报，评论已隐藏，等待管理员复核')
    } else {
      setSubmitError(res?.detail || '举报失败，请稍后再试')
    }
  }

  // 删除评论：确认后调 API，并把该评论及其整棵回复子树从本地状态移除
  async function handleDelete(c) {
    if (!window.confirm('确定删除这条评论及其回复吗？')) return
    await deleteComment(c.id)
    const ids = collectIds(c, comments)
    const next = comments.filter((x) => !ids.includes(x.id))
    setComments(next)
    onCountChange?.(next.length)
  }

  // 递归渲染单条评论：内容 + 操作行 + 内联回复表单 + 嵌套回复
  // 收起规则：默认只展示第一条回复（主评论 + 首条回复 = 前两条），其余通过小三角展开
  function renderComment(c) {
    const isExpanded = expanded.has(c.id)
    const visibleReplies = isExpanded ? c.replies : c.replies.slice(0, 1)
    const hiddenCount = c.replies.length - visibleReplies.length

    function toggleExpand() {
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(c.id)) next.delete(c.id)
        else next.add(c.id)
        return next
      })
    }

    return (
      <li key={c.id} id={`comment-${c.id}`} className="blog-comment">
        <div className="blog-comment-head">
          {c.avatar ? (
            <img className="blog-comment-avatar" src={resolveMediaUrl(c.avatar)} alt={c.author} />
          ) : (
            <span className="blog-comment-avatar is-fallback mono" aria-hidden="true">
              {(c.author || '').slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="blog-comment-author">{c.author}</span>
          {c.is_approved === false && <span className="blog-comment-pending mono">审核中</span>}
          <span className="blog-comment-time mono">{formatTime(c.created_at)}</span>
        </div>
        <p className="blog-comment-content">{c.content}</p>

        <div className="blog-comment-actions">
          <button type="button" className="blog-comment-action-btn" onClick={() => toggleReply(c)}>
            回复
          </button>
          <button
            type="button"
            className={`blog-comment-action-btn${c.liked ? ' is-liked' : ''}`}
            aria-pressed={Boolean(c.liked)}
            onClick={() => handleLikeComment(c)}
          >
            ♥ {c.likes || 0}
          </button>
          {!c.is_mine && (
            <button type="button" className="blog-comment-action-btn" onClick={() => handleReport(c)}>
              举报
            </button>
          )}
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

        {visibleReplies.length > 0 && (
          <ul className="blog-comment-replies">{visibleReplies.map(renderComment)}</ul>
        )}

        {c.replies.length > 1 && (
          <button type="button" className="blog-comment-expand" onClick={toggleExpand}>
            <span className={`blog-comment-chevron${isExpanded ? ' is-open' : ''}`} aria-hidden="true">
              ▸
            </span>
            {isExpanded ? '收起' : `展开 ${hiddenCount} 条回复`}
          </button>
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
          {submitError && <p className="blog-comment-error">{submitError}</p>}
          {notice && <p className="blog-comment-notice">{notice}</p>}
          <textarea
            className="blog-comment-input"
            placeholder="写下你的评论…（回复可用 @用户名 提及对方）"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              if (submitError) setSubmitError('')
            }}
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
