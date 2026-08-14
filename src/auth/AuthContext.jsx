import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loginDetailed, registerDetailed, getMe, getNotifications, setToken, getToken, UNAUTHORIZED_EVENT } from '../api.js'

// 登录态上下文：user（当前用户，未登录为 null）/ ready（初次 token 校验完成）/
// authOpen（登录弹窗开关）/ unread（未读通知数）/ panelOpen（用户面板开关）+
// login / register / logout / refreshUnread / openPanel / closePanel / refreshUser 动作
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)          // 初次 token 校验完成
  const [authOpen, setAuthOpen] = useState(false)     // 登录窗口开关
  const [unread, setUnread] = useState(0)             // 未读通知数（navbar 角标）
  const [panelOpen, setPanelOpen] = useState(false)   // 用户面板开关

  const openAuth = useCallback(() => setAuthOpen(true), [])
  const closeAuth = useCallback(() => setAuthOpen(false), [])

  // 同步未读数：无 token 清零，否则拉取通知接口取 unread_count
  const refreshUnread = useCallback(async () => {
    if (!getToken()) {
      setUnread(0)
      return
    }
    const d = await getNotifications()
    setUnread(d?.unread_count ?? 0)
  }, [])

  // 任一请求 401（token 过期 / 失效）：api 层已清除本地 token，这里重置用户态并唤起登录
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null)
      setUnread(0)
      setPanelOpen(false)
      openAuth()
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [openAuth])

  // 挂载时校验本地 token：有效则拉取用户信息并同步未读数，无效（getMe 返回 null）保持未登录
  useEffect(() => {
    if (!getToken()) {
      setReady(true)
      return
    }
    getMe().then((u) => setUser(u || null)).finally(() => setReady(true))
    refreshUnread()
  }, [refreshUnread])

  const openPanel = useCallback(() => setPanelOpen(true), [])
  const closePanel = useCallback(() => setPanelOpen(false), [])

  // 重新拉取当前用户信息（资料保存后刷新）
  const refreshUser = useCallback(async () => {
    const me = await getMe()
    if (me) setUser(me)
  }, [])

  // 登录：拿到 access token 后保存并拉取用户信息，同步未读数；失败时透传服务端提示（限频/账号错误等）
  const login = useCallback(async (username, password) => {
    const res = await loginDetailed({ username, password })
    if (!res?.ok || !res.data?.access) {
      const detail = res?.detail || ''
      // 401 = 凭据错误（simplejwt 中英文文案 / 封禁账号统一映射）；429 限频文案原样透传
      const mapped =
        res.status === 401 ||
        detail.includes('No active account') ||
        detail.includes('找不到指定凭据') ||
        detail.includes('token_not_valid')
          ? '账号或密码错误'
          : detail
      return { ok: false, detail: mapped || '登录失败，请检查账号密码' }
    }
    setToken(res.data.access)
    const me = await getMe()
    setUser(me || { username })
    refreshUnread()
    return { ok: true }
  }, [refreshUnread])

  // 注册：先建号，成功后直接走登录流程；失败透传服务端提示（限频/用户名已存在等）
  const register = useCallback(async (username, password, email) => {
    const r = await registerDetailed({ username, password, email })
    if (!r?.ok) {
      return { ok: false, detail: r?.detail || '注册失败（用户名可能已存在或网络异常）' }
    }
    return login(username, password)
  }, [login])

  // 退出：清除 token / 用户信息 / 未读数，并关闭用户面板
  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setUnread(0)
    setPanelOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      authOpen,
      openAuth,
      closeAuth,
      login,
      register,
      logout,
      unread,
      refreshUnread,
      panelOpen,
      openPanel,
      closePanel,
      refreshUser,
    }),
    [
      user,
      ready,
      authOpen,
      openAuth,
      closeAuth,
      login,
      register,
      logout,
      unread,
      refreshUnread,
      panelOpen,
      openPanel,
      closePanel,
      refreshUser,
    ]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
