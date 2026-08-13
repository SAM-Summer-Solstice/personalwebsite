import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as apiLogin, register as apiRegister, getMe, getNotifications, setToken, getToken, UNAUTHORIZED_EVENT } from '../api.js'

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

  // 登录：拿到 access token 后保存并拉取用户信息，同步未读数
  const login = useCallback(async (username, password) => {
    const data = await apiLogin({ username, password })
    if (!data || !data.access) return { ok: false, detail: '登录失败，请检查账号密码' }
    setToken(data.access)
    const me = await getMe()
    setUser(me || { username })
    refreshUnread()
    return { ok: true }
  }, [refreshUnread])

  // 注册：先建号，成功后直接走登录流程
  const register = useCallback(async (username, password, email) => {
    const r = await apiRegister({ username, password, email })
    if (!r) return { ok: false, detail: '注册失败（用户名可能已存在或网络异常）' }
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
