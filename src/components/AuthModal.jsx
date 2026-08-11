import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { requestPasswordReset, confirmPasswordReset } from '../api.js'
import './AuthModal.css'

// 登录 / 注册 / 忘记密码 弹窗：navbar 登录入口、未登录点赞 / 发表评论共用。
// 打开时重置表单并聚焦用户名；ESC 或点击遮罩关闭。
export default function AuthModal() {
  const { authOpen, closeAuth, login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('') // 登录页成功提示（如密码重置完成）
  const [submitting, setSubmitting] = useState(false)
  const [forgotStep, setForgotStep] = useState('request') // 'request' | 'confirm'
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [forgotPwd, setForgotPwd] = useState('')
  const [forgotSending, setForgotSending] = useState(false)
  const [countdown, setCountdown] = useState(0) // 验证码重发倒计时（秒）
  const usernameRef = useRef(null)

  // 打开弹窗时重置表单；监听 ESC 关闭
  useEffect(() => {
    if (!authOpen) return
    setMode('login')
    setUsername('')
    setPassword('')
    setEmail('')
    setError('')
    setHint('')
    setSubmitting(false)
    setForgotStep('request')
    setForgotEmail('')
    setForgotCode('')
    setForgotPwd('')
    setForgotSending(false)
    setCountdown(0)
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

  // 验证码重发倒计时：每秒 -1，到 0 停
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

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
    setHint('')
  }

  // 进入忘记密码：请求验证码步骤
  function goForgot() {
    setMode('forgot')
    setForgotStep('request')
    setForgotCode('')
    setForgotPwd('')
    setCountdown(0)
    setError('')
    setHint('')
  }

  // 返回登录（request / confirm 两步共用）
  function backToLogin() {
    setMode('login')
    setCountdown(0)
    setError('')
    setHint('')
  }

  // 请求验证码：成功后进入确认步骤并开始 60s 倒计时
  async function handleForgotRequest(e) {
    e.preventDefault()
    const em = forgotEmail.trim()
    if (!em || forgotSending) return
    setForgotSending(true)
    setError('')
    const data = await requestPasswordReset(em)
    setForgotSending(false)
    if (data) {
      setForgotStep('confirm')
      setCountdown(60)
    } else {
      setError('发送失败，请检查邮箱后重试')
    }
  }

  // 校验验证码 + 新密码：成功切回登录并提示，失败展示通用错误
  async function handleForgotConfirm(e) {
    e.preventDefault()
    const em = forgotEmail.trim()
    const code = forgotCode.trim()
    const pwd = forgotPwd
    if (!em || !code || !pwd || pwd.length < 6 || forgotSending) return
    setForgotSending(true)
    setError('')
    const data = await confirmPasswordReset(em, code, pwd)
    setForgotSending(false)
    if (data) {
      setMode('login')
      setForgotCode('')
      setForgotPwd('')
      setHint('密码已重置，请使用新密码登录')
    } else {
      setError('重置失败，请检查验证码或稍后再试')
    }
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
          <span className="auth-modal-title mono">
            {mode === 'login' ? 'login' : mode === 'register' ? 'register' : 'forgot'}
          </span>
          <button type="button" className="auth-modal-close mono" onClick={closeAuth} aria-label="关闭">
            ✕
          </button>
        </div>

        {mode !== 'forgot' && (
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
        )}

        {error && <p className="auth-modal-error">{error}</p>}

        {mode !== 'forgot' && (
          <>
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
                    required
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

            {hint && <p className="auth-modal-success">{hint}</p>}

            {mode === 'login' && (
              <button type="button" className="auth-forgot-link mono" onClick={goForgot}>
                忘记密码？
              </button>
            )}
          </>
        )}

        {mode === 'forgot' && (
          <div className="auth-forgot">
            {forgotStep === 'request' ? (
              <form className="auth-modal-form" onSubmit={handleForgotRequest}>
                <p className="auth-hint">输入注册邮箱，我们将发送重置验证码</p>
                <label className="auth-field">
                  <span className="auth-field-label mono">email</span>
                  <input
                    className="auth-input mono"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="auth-submit mono"
                  disabled={forgotSending || countdown > 0}
                >
                  {forgotSending
                    ? '…'
                    : countdown > 0
                      ? `重新发送 (${countdown}s)`
                      : '获取验证码'}
                </button>
                <button type="button" className="auth-forgot-link mono" onClick={backToLogin}>
                  返回登录
                </button>
              </form>
            ) : (
              <form className="auth-modal-form" onSubmit={handleForgotConfirm}>
                <p className="auth-hint">验证码已发送至 {forgotEmail}，请在下方输入</p>
                <label className="auth-field">
                  <span className="auth-field-label mono">email</span>
                  <input
                    className="auth-input mono"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-field-label mono">code</span>
                  <input
                    className="auth-input mono"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value)}
                    autoComplete="one-time-code"
                    required
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-field-label mono">new password</span>
                  <input
                    className="auth-input mono"
                    type="password"
                    minLength={6}
                    value={forgotPwd}
                    onChange={(e) => setForgotPwd(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <p className="auth-hint">新密码至少 6 位</p>
                <button type="submit" className="auth-submit mono" disabled={forgotSending}>
                  {forgotSending ? '…' : '提交'}
                </button>
                <button type="button" className="auth-forgot-link mono" onClick={backToLogin}>
                  返回登录
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
