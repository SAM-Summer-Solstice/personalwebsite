import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { getNotifications, markNotificationsRead, markNotificationRead, updateMe } from '../api.js'
import './UserPanel.css'
import './AuthModal.css' // 复用 .auth-modal-tab / .auth-submit / .auth-input / .auth-field 等表单样式

// 通知时间格式化：YYYY-MM-DD HH:mm（mono 风格展示）
function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 用户面板：消息（通知） / 资料（邮箱）两个 tab；打开时重置到消息 tab 并拉取通知
export default function UserPanel() {
  const { panelOpen, closePanel, user, logout, refreshUnread, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('messages') // 'messages' | 'profile'
  const [notifications, setNotifications] = useState([])
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // 打开面板：重置到消息 tab、预填邮箱、拉取通知；ESC / 遮罩点击关闭
  useEffect(() => {
    if (!panelOpen) return
    setTab('messages')
    setSaveMsg('')
    setEmail(user?.email || '')
    getNotifications().then((d) => {
      if (d) setNotifications(d.list || [])
    })
    const onKey = (e) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen, closePanel])

  // 点击通知：未读先标记已读（本地即时 + 刷新角标），关闭面板并跳到对应文章
  async function handleItemClick(n) {
    if (!n.is_read) {
      await markNotificationRead(n.id)
      setNotifications((list) =>
        list.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      )
    }
    refreshUnread()
    closePanel()
    navigate(`/posts/${n.post_slug}`)
  }

  // 全部已读：本地全部置为已读 + 刷新角标
  async function handleReadAll() {
    await markNotificationsRead()
    setNotifications((list) => list.map((x) => ({ ...x, is_read: true })))
    refreshUnread()
  }

  // 保存资料：更新邮箱成功后刷新用户信息并提示
  async function handleSave(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setSaveMsg('')
    const me = await updateMe({ email: email.trim() })
    setSaving(false)
    if (me) {
      refreshUser()
      setSaveMsg('保存成功')
    } else {
      setSaveMsg('保存失败，请检查邮箱格式')
    }
  }

  if (!panelOpen) return null

  return (
    <div
      className="user-panel-overlay"
      onClick={closePanel}
      role="dialog"
      aria-modal="true"
      aria-label="用户面板"
    >
      <div className="user-panel" onClick={(e) => e.stopPropagation()}>
        <div className="user-panel-head">
          <span className="user-panel-title mono">user panel</span>
          <button type="button" className="user-panel-close mono" onClick={closePanel} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="auth-modal-tabs">
          <button
            type="button"
            className={`auth-modal-tab${tab === 'messages' ? ' is-active' : ''}`}
            onClick={() => setTab('messages')}
          >
            消息
          </button>
          <button
            type="button"
            className={`auth-modal-tab${tab === 'profile' ? ' is-active' : ''}`}
            onClick={() => setTab('profile')}
          >
            资料
          </button>
        </div>

        {tab === 'messages' && (
          <div className="user-panel-section">
            <div className="user-panel-section-head">
              <span className="user-panel-section-title mono">notifications</span>
              <button type="button" className="user-panel-read-all mono" onClick={handleReadAll}>
                全部已读
              </button>
            </div>

            {notifications.length === 0 ? (
              <p className="user-panel-empty">暂无消息</p>
            ) : (
              <ul className="user-panel-msg-list">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`user-panel-msg${n.is_read ? '' : ' is-unread'}`}
                      onClick={() => handleItemClick(n)}
                    >
                      <span className="user-panel-msg-main">
                        <span className="user-panel-msg-actor mono">@{n.actor}</span>
                        回复了你在《{n.post_title}》的评论
                      </span>
                      <span className="user-panel-msg-preview mono">{n.comment_preview}</span>
                      <span className="user-panel-msg-time mono">{formatTime(n.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="user-panel-section">
            <div className="auth-field">
              <span className="auth-field-label mono">username</span>
              <span className="user-panel-username mono">@{user?.username}</span>
            </div>

            <form className="user-panel-profile-form" onSubmit={handleSave}>
              <label className="auth-field">
                <span className="auth-field-label mono">email</span>
                <input
                  className="auth-input mono"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <button type="submit" className="auth-submit mono" disabled={saving}>
                {saving ? '…' : '保存'}
              </button>
            </form>

            {saveMsg && (
              <p className={`user-panel-save-msg${saveMsg === '保存成功' ? ' is-ok' : ' is-err'}`}>
                {saveMsg}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          className="auth-submit user-panel-logout mono"
          onClick={logout}
        >
          退出登录
        </button>
      </div>
    </div>
  )
}
