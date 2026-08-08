import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import './AuthModal.css'

// 登录 / 注册弹窗：navbar 登录入口、未登录点赞 / 发表评论共用。
// 打开时重置表单并聚焦用户名；ESC 或点击遮罩关闭。
export default function AuthModal() {
  const { authOpen, closeAuth, login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const usernameRef = useRef(null)

  // 打开弹窗时重置表单；监听 ESC 关闭
  useEffect(() => {
    if (!authOpen) return
    setMode('login')
    setUsername('')
    setPassword('')
    setEmail('')
    setError('')
    setSubmitting(false)
    const onKey = (e) => {
      if (e.key === 'Escape') closeAuth()
    }
    window.addEventListener('keydown', onKey)
    const focusTimer = setTimeout(() => usernameRef.current?.focus(), 0)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(focusTimer)
    }
  }, [authOpen, closeAuth])

  // 提交登录 / 注册：成功关窗，失败展示服务端返回的 detail
  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    const result =
      mode === 'login'
        ? await login(username.trim(), password)
        : await register(username.trim(), password, email.trim())
    setSubmitting(false)
    if (result?.ok) {
      closeAuth()
    } else {
      setError(result?.detail || '操作失败，请稍后再试')
    }
  }

  function switchMode(m) {
    setMode(m)
    setError('')
  }

  if (!authOpen) return null

  return (
    <div
      className="auth-modal-overlay"
      onClick={closeAuth}
      role="dialog"
      aria-modal="true"
      aria-label="登录注册"
    >
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-head">
          <span className="auth-modal-title mono">{mode === 'login' ? 'login' : 'register'}</span>
          <button type="button" className="auth-modal-close mono" onClick={closeAuth} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="auth-modal-tabs">
          <button
            type="button"
            className={`auth-modal-tab${mode === 'login' ? ' is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={`auth-modal-tab${mode === 'register' ? ' is-active' : ''}`}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        {error && <p className="auth-modal-error">{error}</p>}

        <form className="auth-modal-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-field-label mono">username</span>
            <input
              className="auth-input mono"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              ref={usernameRef}
              autoComplete="username"
              required
            />
          </label>

          {mode === 'register' && (
            <label className="auth-field">
              <span className="auth-field-label mono">email</span>
              <input
                className="auth-input mono"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
          )}

          <label className="auth-field">
            <span className="auth-field-label mono">password</span>
            <input
              className="auth-input mono"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          {mode === 'register' && <p className="auth-hint">密码至少 6 位</p>}

          <button type="submit" className="auth-submit mono" disabled={submitting}>
            {submitting ? '…' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  )
}
