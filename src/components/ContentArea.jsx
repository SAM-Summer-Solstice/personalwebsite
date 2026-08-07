import { useLayoutEffect, useRef } from 'react'
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

  // 切换页面：先保存旧页进度，再恢复新页进度（首次访问为顶部 0）
  useLayoutEffect(() => {
    const area = document.querySelector('.content-area')
    if (!area) return
    scrollPos.current[prevTab.current] = area.scrollTop
    prevTab.current = activeTab
    area.scrollTop = scrollPos.current[activeTab] ?? 0
  }, [activeTab])

  // 页面内容挂载后初始化滚动动效（useLayoutEffect 在绘制前隐藏元素，避免 FOUC）；切换/卸载时还原
  useLayoutEffect(() => {
    const cleanup = initPageMotion(shellRef.current)
    return cleanup
  }, [activeTab])

  return (
    <>
      <main className="content-area">
        <div className="content-shell" ref={shellRef} key={activeTab}>
          {activeTab === 'home' && <HomeSection onNavigate={onNavigate} />}
          {activeTab === 'blog' && <BlogSection focusId={focusId} resetSignal={resetSignal} />}
          {activeTab === 'projects' && <ProjectsSection focusId={focusId} />}
          {activeTab === 'about' && <AboutSection />}
        </div>
      </main>
      <BackToTop />
    </>
  )
}
