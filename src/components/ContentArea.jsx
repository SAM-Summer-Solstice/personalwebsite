import { useLayoutEffect, useRef, useState } from 'react'
import HomeSection from './sections/HomeSection.jsx'
import BlogSection from './sections/BlogSection.jsx'
import ProjectsSection from './sections/ProjectsSection.jsx'
import AboutSection from './sections/AboutSection.jsx'
import BackToTop from './BackToTop.jsx'
import { initPageMotion } from '../motion/usePageMotion.js'
import './ContentArea.css'

export default function ContentArea({ activeTab, onNavigate, focusId, resetSignal }) {
  // 每个页面的观看进度单独记录（content-area 滚动位置），切换页面时保存旧页、恢复新页
  const scrollPos = useRef({ home: 0, blog: 0, projects: 0, about: 0 })
  const prevTab = useRef(activeTab)
  const shellRef = useRef(null)
  // 动效代数：0 = 当前页数据未就绪（不初始化动效）；>0 = 数据已就绪且已初始化
  // 切页 → 重置为 0 → 新页数据就绪（app:content-ready 防抖合并）→ +1 → initPageMotion 在数据渲染完成后执行，
  // 保证异步子项（data-stagger 卡片等）存在时才创建动画，且每页只初始化一次、不重播
  const [motionEpoch, setMotionEpoch] = useState(0)
  const readyTimer = useRef(null)

  // 监听数据就绪信号：多个 hook 同时就绪时防抖合并，只触发一次动效初始化（120ms 窗口）
  useLayoutEffect(() => {
    const onContentReady = () => {
      clearTimeout(readyTimer.current)
      readyTimer.current = setTimeout(() => setMotionEpoch((e) => e + 1), 120)
    }
    window.addEventListener('app:content-ready', onContentReady)
    return () => {
      clearTimeout(readyTimer.current)
      window.removeEventListener('app:content-ready', onContentReady)
    }
  }, [])

  // 滚动时记录当前页面的进度
  useLayoutEffect(() => {
    const area = document.querySelector('.content-area')
    if (!area) return
    const onScroll = () => {
      scrollPos.current[prevTab.current] = area.scrollTop
    }
    area.addEventListener('scroll', onScroll, { passive: true })
    return () => area.removeEventListener('scroll', onScroll)
  }, [])

  // 切换页面：先保存旧页进度，再恢复新页进度（首次访问为顶部 0）；同时把动效代数重置为 0，
  // 等待新页数据就绪后再初始化动效（见上方注释的完整时序）
  useLayoutEffect(() => {
    const area = document.querySelector('.content-area')
    if (!area) return
    scrollPos.current[prevTab.current] = area.scrollTop
    prevTab.current = activeTab
    area.scrollTop = scrollPos.current[activeTab] ?? 0
    setMotionEpoch((e) => (e === 0 ? e : 0))
  }, [activeTab])

  // 页面内容挂载后初始化滚动动效（useLayoutEffect 在绘制前隐藏元素，避免 FOUC）；切换/卸载时还原
  // 仅当数据已就绪（motionEpoch > 0）才执行：异步数据渲染晚于切页事件，若立即初始化会因子项缺失而漏建动画
  useLayoutEffect(() => {
    if (motionEpoch === 0) return
    const cleanup = initPageMotion(shellRef.current)
    return cleanup
  }, [activeTab, motionEpoch])

  return (
    <>
      <main className="content-area">
        <div className="content-shell" ref={shellRef} key={activeTab}>
          {activeTab === 'home' && <HomeSection onNavigate={onNavigate} />}
          {activeTab === 'blog' && <BlogSection focusId={focusId} resetSignal={resetSignal} onNavigate={onNavigate} />}
          {activeTab === 'projects' && <ProjectsSection focusId={focusId} />}
          {activeTab === 'about' && <AboutSection />}
        </div>
      </main>
      <BackToTop />
    </>
  )
}
