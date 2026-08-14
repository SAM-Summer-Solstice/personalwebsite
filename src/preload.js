// 空闲预取：页面 load 后利用浏览器空闲时间预取 3D 相关 JS chunk 与静态资产，
// 进入 projects / about 页时资源已命中缓存，消除网络等待。
// 需要从 Lanyard 的资产导入 URL 以便 fetch 预热（与 useGLTF/useTexture 共享 HTTP 缓存）
import cardGLB from './assets/lanyard/card.glb'
import lanyardPNG from './assets/lanyard/lanyard.png'

let started = false

export function startPreload() {
  if (started) return
  started = true

  // 移动端（粗指针/窄屏）：Lanyard chunk 约 2.4MB，解析与 GLB 拉取会和弱手机的
  // 首屏渲染、首次导航抢资源造成卡顿。移动端推迟到用户首次交互后再预取（视觉无变化）
  const isMobile =
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
    window.innerWidth < 640

  const schedule = (fn, timeout = 4000) => {
    if (typeof window.requestIdleCallback === 'function') {
      // timeout 兜底：即使持续无空闲也必须执行
      window.requestIdleCallback(fn, { timeout })
    } else {
      window.setTimeout(fn, 1200)
    }
  }

  const prefetch = () =>
    schedule(async () => {
      try {
        // 预取 JS chunk（模块进入浏览器缓存），Lanyard / ProjectsNetwork 按需页面秒开
        await Promise.all([
          import('./components/sections/ProjectsNetwork.jsx'),
          import('./components/Lanyard.jsx'),
        ])
        // 预取静态资产（与 useGLTF / useTexture 共用 HTTP 缓存）
        fetch(cardGLB).catch(() => {})
        fetch(lanyardPNG).catch(() => {})
      } catch {
        /* 预取失败不影响页面 */
      }
    })

  // load 事件可能早于 React useEffect 触发（快速命中缓存时），
  // 用 readyState 判断兜底，避免监听器注册晚了导致预取永不触发
  if (document.readyState === 'complete') {
    if (isMobile) {
      // 等首次触摸/点击后再预取（once 保证只触发一次）
      window.addEventListener('pointerdown', prefetch, { once: true, passive: true })
      window.addEventListener('touchend', prefetch, { once: true, passive: true })
    } else {
      prefetch()
    }
  } else {
    const onLoad = () => {
      if (isMobile) {
        window.addEventListener('pointerdown', prefetch, { once: true, passive: true })
        window.addEventListener('touchend', prefetch, { once: true, passive: true })
      } else {
        prefetch()
      }
    }
    window.addEventListener('load', onLoad, { once: true })
  }
}
