import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile, resolveMediaUrl } from '../api.js'
import './UserProfileModal.css'
import './AuthModal.css' // 复用弹窗布局样式

// 用户主页查看事件：HomeSection 用户墙点击时广播
export const USER_VIEW_EVENT = 'user:view'

// 评论时间格式化：YYYY-MM-DD HH:mm
function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 用户个人主页弹窗：头像 / 用户名 / 注册年月 / 签名 / 近期评论（点击评论跳转对应文章）
export default function UserProfileModal() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onView = (e) => {
      const name = e.detail?.username
      if (!name) return
      setUsername(name)
      setProfile(null)
      setOpen(true)
      setLoading(true)
      getUserProfile(name).then((d) => {
        setProfile(d)
        setLoading(false)
      })
    }
    window.addEventListener(USER_VIEW_EVENT, onView)
    return () => window.removeEventListener(USER_VIEW_EVENT, onView)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function goPost(slug) {
    setOpen(false)
    navigate(`/posts/${slug}`)
  }

  if (!open) return null

  return (
    <div
      className="user-modal-overlay"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={`用户主页 ${username}`}
    >
      <div className="user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-head">
          <span className="auth-modal-title mono">user page</span>
          <button
            type="button"
            className="auth-modal-close mono"
            onClick={() => setOpen(false)}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {loading || !profile ? (
          <p className="user-modal-empty">加载中…</p>
        ) : (
          <div className="user-modal-body">
            <div className="user-modal-head-row">
              {profile.avatar ? (
                <img
                  className="user-modal-avatar"
                  src={resolveMediaUrl(profile.avatar)}
                  alt={profile.username}
                />
              ) : (
                <span className="user-modal-avatar is-fallback mono" aria-hidden="true">
                  {(profile.username || '').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="user-modal-id">
                <span className="user-modal-name mono">@{profile.username}</span>
                <span className="user-modal-joined mono">joined {profile.joined}</span>
              </div>
            </div>

            {profile.bio && <p className="user-modal-bio">{profile.bio}</p>}

            <div className="user-modal-comments-head mono">
              comments · {profile.comments?.length ?? 0}
            </div>
            {profile.comments?.length ? (
              <ul className="user-modal-comments">
                {profile.comments.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="user-modal-comment"
                      onClick={() => goPost(c.post_slug)}
                      title={`查看《${c.post_title}》`}
                    >
                      <span className="user-modal-comment-post mono">《{c.post_title}》</span>
                      <span className="user-modal-comment-text">{c.content}</span>
                      <span className="user-modal-comment-time mono">{formatTime(c.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="user-modal-empty">ta 还没有发表过评论</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
