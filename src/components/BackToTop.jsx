import { useEffect, useState } from 'react'

const RING_R = 20
const CIRC = 2 * Math.PI * RING_R

// 返回顶部：右下角圆钮，外圈阅读进度环 + 中心 ↑（无额外提示文字）
export default function BackToTop() {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const area = document.querySelector('.content-area')
    if (!area) return
    // rAF 合并：高频滚动时每帧最多一次 setState，避免多余 React 渲染
    let raf = 0
    const update = () => {
      raf = 0
      const max = area.scrollHeight - area.clientHeight
      setProgress(max > 0 ? Math.min(1, area.scrollTop / max) : 0)
      setVisible(area.scrollTop > 480)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    area.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      area.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  function handleClick() {
    const area = document.querySelector('.content-area')
    if (!area) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    area.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      className={`back-to-top${visible ? ' is-visible' : ''}`}
      aria-label="返回页面顶部"
      onClick={handleClick}
    >
      <svg className="back-to-top-ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle className="back-to-top-ring-track" cx="24" cy="24" r={RING_R} />
        <circle
          className="back-to-top-ring-progress"
          cx="24"
          cy="24"
          r={RING_R}
          transform="rotate(-90 24 24)"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
        />
      </svg>
      <span className="back-to-top-arrow" aria-hidden="true">
        ↑
      </span>
    </button>
  )
}
