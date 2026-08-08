import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as apiLogin, register as apiRegister, getMe, setToken, getToken } from '../api.js'

// 登录态上下文：user（当前用户，未登录为 null）/ ready（初次 token 校验完成）/
// authOpen（登录弹窗开关）+ login / register / logout 动作
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)          // 初次 token 校验完成
  const [authOpen, setAuthOpen] = useState(false)     // 登录窗口开关

  // 挂载时校验本地 token：有效则拉取用户信息，无效（getMe 返回 null）保持未登录
  useEffect(() => {
    if (!getToken()) {
      setReady(true)
      return
    }
    getMe().then((u) => setUser(u || null)).finally(() => setReady(true))
  }, [])

  const openAuth = useCallback(() => setAuthOpen(true), [])
  const closeAuth = useCallback(() => setAuthOpen(false), [])

  // 登录：拿到 access token 后保存并拉取用户信息
  const login = useCallback(async (username, password) => {
    const data = await apiLogin({ username, password })
    if (!data || !data.access) return { ok: false, detail: '登录失败，请检查账号密码' }
    setToken(data.access)
    const me = await getMe()
    setUser(me || { username })
    return { ok: true }
  }, [])

  // 注册：先建号，成功后直接走登录流程
  const register = useCallback(async (username, password, email) => {
    const r = await apiRegister({ username, password, email })
    if (!r) return { ok: false, detail: '注册失败（用户名可能已存在或网络异常）' }
    return login(username, password)
  }, [login])

  // 退出：清除 token 与用户信息
  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, authOpen, openAuth, closeAuth, login, register, logout }),
    [user, ready, authOpen, openAuth, closeAuth, login, register, logout]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
