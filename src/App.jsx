import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ContentArea from './components/ContentArea.jsx'
import Terminal from './components/Terminal.jsx'
import EasterEggs from './components/EasterEggs.jsx'
import Dither from './components/Dither.jsx'
import AuthModal from './components/AuthModal.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { startPreload } from './preload.js'
import { usePosts, useProjects, useAbout } from './data/useContent.js'

// URL 路径 → 页面 tab（blog 单篇 /posts/:id 也归入 blog）
function pathToTab(pathname) {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/posts')) return 'blog'
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname.startsWith('/about')) return 'about'
  return 'home'
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [navTick, setNavTick] = useState(0) // 重复点击当前 tab → 重置信号（保留原语义）
  const [confettiKey, setConfettiKey] = useState(0) // >0 时播放彩带，自增重播
  const [birthday, setBirthday] = useState(false)
  const [starfield, setStarfield] = useState(false)
  const [matrix, setMatrix] = useState(false)
  const activeTab = pathToTab(location.pathname)
  // 从首页跳转选中条目时带上的高亮 id（projects 用；blog 跳列表高亮也用）
  const focusId = location.state?.focusId || null

  // 终端命令所需数据：未加载完成时为空，命令同样不崩溃
  const { posts } = usePosts()
  const { projects } = useProjects()
  const { about } = useAbout()

  // 页面加载后空闲预取 3D 相关资源（仅一次），进入 projects/about 无网络等待
  useEffect(() => {
    startPreload()
  }, [])

  function handleEasterEgg(type) {
    if (type === 'confetti') setConfettiKey((k) => k + 1)
    else if (type === 'birthday') setBirthday(true)
    else if (type === 'starfield') setStarfield((s) => !s)
    else if (type === 'matrix') setMatrix((m) => !m)
  }

  function handleOverlayDone(kind) {
    if (kind === 'confetti') setConfettiKey(0)
    else if (kind === 'birthday') setBirthday(false)
  }

  // tab/id → 路径。blog 带 id → /posts/:id；其余 → /posts /projects /about /
  function tabToPath(tab, id) {
    if (tab === 'blog') return id ? `/posts/${id}` : '/posts'
    if (tab === 'projects') return '/projects'
    if (tab === 'about') return '/about'
    return '/'
  }

  // 统一导航入口：普通跳转只传 tab；从首页选中条目跳转时附带上该条 id
  function handleNavigate(tab, id) {
    // blog 带 id（首页最近文章）→ 进列表并携带高亮 id；列表内点卡片由 BlogSection 直接进单篇
    const target = tab === 'blog' && id ? '/posts' : tabToPath(tab, id)
    // 重复点击当前 tab（已是目标路径且无 id）→ 触发该页重置信号
    if (location.pathname === target && !id) setNavTick((n) => n + 1)
    navigate(target, { state: id ? { focusId: id } : undefined })
  }

  return (
    <>
      <div className="bg-dither" aria-hidden="true">
        <Dither
          waveColor={[0.5568627450980392, 0.5490196078431373, 0.8352941176470589]}
          /* projects/about 页与 3D 星图/吊牌并存，冻结波浪背景释放 GPU 帧预算；其余页保持动画 */
          disableAnimation={activeTab === 'projects' || activeTab === 'about'}
          enableMouseInteraction={true}
          mouseRadius={0.8}
          colorNum={25}
          waveAmplitude={0.31}
          waveFrequency={4.3}
          waveSpeed={0.05}
        />
      </div>
      <div className="app">
        <Navbar activeTab={activeTab} onNavigate={handleNavigate} />
        {/* 路由包裹：/posts/:postId 使 BlogSection 的 useParams 取到 postId；其余路径统一走 * */}
        <Routes>
          <Route
            path="/posts/:postId"
            element={
              <ContentArea
                activeTab={activeTab}
                onNavigate={handleNavigate}
                focusId={focusId}
                resetSignal={navTick}
              />
            }
          />
          <Route
            path="*"
            element={
              <ContentArea
                activeTab={activeTab}
                onNavigate={handleNavigate}
                focusId={focusId}
                resetSignal={navTick}
              />
            }
          />
        </Routes>
        <Terminal
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onEasterEgg={handleEasterEgg}
          matrixActive={matrix}
          posts={posts}
          projects={projects}
          about={about}
        />
        <EasterEggs
          confettiKey={confettiKey}
          birthday={birthday}
          starfield={starfield}
          matrix={matrix}
          onOverlayDone={handleOverlayDone}
        />
      </div>
      {/* 登录 / 注册弹窗：全局单例，由 AuthContext 的 authOpen 控制显隐 */}
      <AuthModal />
    </>
  )
}
