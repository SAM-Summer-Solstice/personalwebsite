import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import './Navbar.css'

const TABS = [
  { id: 'blog', label: 'posts' },
  { id: 'projects', label: 'projects' },
  { id: 'about', label: 'about' },
]

function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return now
}

function pad(n) {
  return String(n).padStart(2, '0')
}

export default function Navbar({ activeTab, onNavigate }) {
  const { user, openAuth, logout } = useAuth()
  const now = useClock()
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <button
          type="button"
          className="navbar-logo mono"
          aria-label="回到首页（home）"
          title="home — 回到根目录"
          onClick={() => onNavigate('home')}
        >
          home
        </button>

        <nav className="navbar-tabs" aria-label="主导航">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`navbar-tab mono${activeTab === tab.id ? ' is-active' : ''}`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => onNavigate(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="navbar-right">
          <div className="navbar-clock mono" aria-live="off">
            <span className="navbar-clock-date">{date}</span>
            <span className="navbar-clock-time">{time}</span>
          </div>

          <div className="navbar-auth">
            {user ? (
              <>
                <span className="navbar-user mono" title={user.username}>
                  {user.username}
                </span>
                <button type="button" className="navbar-auth-btn mono" onClick={logout}>
                  退出
                </button>
              </>
            ) : (
              <button type="button" className="navbar-auth-btn mono" onClick={openAuth}>
                登录
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
