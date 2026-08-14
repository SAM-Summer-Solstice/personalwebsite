// 高级动效系统：GSAP + ScrollTrigger
// - 统一滚动容器为 .content-area（页面内容区，非 window）
// - 只操作 transform / opacity / clip-path，不触发 layout，性能友好
// - 数据属性约定：
//     [data-reveal-title]  模块标题强进场（clip 遮罩揭开 + 位移 + scaleY 压缩归位）
//     [data-stagger]       容器：直接子元素依次进场
//     [data-reveal]        单元素轻量进场
//     .md-figure           图片：reveal（img scale+opacity）+ 轻微视差（figure translateY）
// - 初始隐藏态由 hideMotionElements 在挂载时立即注入（绘制前），并由 initPageMotion 的 fromTo 显式 from 复核；
//   fail-open：脚本失败/未执行时内容始终可见
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const EASE_TITLE = 'power4.out' // 标题：大幅、克制、无弹跳
const EASE_CARD = 'power3.out' // 卡片/内容：自然减速

// 动效克制化：每个 stagger 容器只动画前 N 个条目（起到"灵动"点缀作用），
// 其余条目直接可见——避免条目很多时切页瞬间创建大量动画与合成层导致卡顿
const STAGGER_LIMIT = 6

function scrollerEl() {
  return document.querySelector('.content-area')
}

// 懒加载图片加载引发的 ScrollTrigger.refresh 去抖：批量合并，避免长文多图滚动途中反复刷新导致位置跳动
let refreshTimer = null
function scheduleScrollRefresh() {
  if (refreshTimer) return
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    ScrollTrigger.refresh()
  }, 120)
}

// 元素是否已完全滚出 scroller 视口上方（true = 已滚过）。
function isScrolledPast(sc, el) {
  const scRect = sc.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  return elRect.bottom < scRect.top
}

// 元素顶部是否已在 scroller 视口内或上方（true = 在视口内/已滚过）。
function isInOrAboveViewport(sc, el) {
  const scRect = sc.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  return elRect.top - scRect.top < sc.clientHeight
}

// 跳过逻辑（供 initPageMotion 与 hideMotionElements 共享）：
// 顶部（scrollTop=0，首次进入页面）：仅"已滚出视口上方"的元素跳过，首屏内元素保留进场动画；
// 深滚动恢复（scrollTop>0）：视口内及上方元素跳过，避免切回时整批重播入场动画
function shouldSkipEl(sc, el) {
  return sc.scrollTop <= 0 ? isScrolledPast(sc, el) : isInOrAboveViewport(sc, el)
}

/**
 * 在浏览器绘制前立即为动效元素注入与各动画 from 态一致的隐藏初始态（gsap.set），
 * 消除"DOM 就绪 → 动效初始化（防抖 120ms）"窗口期内的刷新闪动（FOUC）。
 * - 复用 shouldSkip 跳过逻辑：已滚过/视口内的元素保持静态可见，不隐藏
 * - 必须与 initPageMotion 内的 from 态完全一致，避免初始态与动画起跳态错位
 * @param {HTMLElement} scope 页面内容根（content-shell）
 */
export function hideMotionElements(scope) {
  if (!scope) return
  const sc = scrollerEl()
  if (!sc) return

  // 模块标题：遮罩揭开初始态
  scope.querySelectorAll('[data-reveal-title]').forEach((el) => {
    if (shouldSkipEl(sc, el)) return
    gsap.set(el, { clipPath: 'inset(0% 0% 100% 0%)', y: 46, scaleY: 1.14, transformOrigin: '0 100%' })
  })

  // 卡片/条目：依次进场初始态（只隐藏前 STAGGER_LIMIT 个未跳过子项）
  scope.querySelectorAll('[data-stagger]').forEach((container) => {
    const items = [...container.children].filter((el) => el.nodeType === 1)
    if (!items.length) return
    const limit = Number(container.dataset.staggerLimit) || STAGGER_LIMIT
    const animated = items.filter((el) => !shouldSkipEl(sc, el)).slice(0, limit)
    if (!animated.length) return
    gsap.set(animated, { y: 30, opacity: 0 })
  })

  // 单元素轻量进场初始态
  scope.querySelectorAll('[data-reveal]').forEach((el) => {
    if (shouldSkipEl(sc, el)) return
    gsap.set(el, { y: 22, opacity: 0 })
  })

  // Markdown 正文图片：img reveal 初始态（figure 视差无需隐藏）
  scope.querySelectorAll('.md-figure').forEach((fig) => {
    if (shouldSkipEl(sc, fig)) return
    const img = fig.querySelector('img')
    if (!img) return
    gsap.set(img, { scale: 1.12, opacity: 0 })
  })
}

/**
 * 扫描 scope 内动效元素并创建 ScrollTrigger 动画。
 * @param {HTMLElement} scope 页面内容根（content-shell）
 * @returns {() => void} cleanup：还原所有由动效产生的内联样式并销毁 ScrollTrigger
 */
export function initPageMotion(scope) {
  if (!scope) return () => {}
  const sc = scrollerEl()
  if (!sc) return () => {}

  const ctx = gsap.context(() => {
    ScrollTrigger.config({ ignoreMobileResize: true })

    // 顶部（scrollTop=0，首次进入页面）：仅"已滚出视口上方"的元素跳过，首屏内元素保留进场动画；
    // 深滚动恢复（scrollTop>0）：视口内及上方元素跳过，避免切回时整批重播入场动画
    const shouldSkip = (el) =>
      sc.scrollTop <= 0 ? isScrolledPast(sc, el) : isInOrAboveViewport(sc, el)

    // 模块标题：遮罩揭开（clip-path 从下往上）+ 位移 + 轻微压缩归位
    scope.querySelectorAll('[data-reveal-title]').forEach((el) => {
      if (shouldSkip(el)) {
        // 跳过动画时必须还原 hideMotionElements 注入的隐藏态，否则标题被 clip 全裁/位移，顶部留白
        gsap.set(el, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, scaleY: 1 })
        return
      }
      gsap.fromTo(
        el,
        { clipPath: 'inset(0% 0% 100% 0%)', y: 46, scaleY: 1.14, transformOrigin: '0 100%' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          y: 0,
          scaleY: 1,
          duration: 1.05,
          ease: EASE_TITLE,
          scrollTrigger: { trigger: el, scroller: sc, start: 'top 85%', once: true },
        }
      )
    })

    // 卡片/条目：依次进场（单 trigger + stagger，只动前 STAGGER_LIMIT 个，条目多时自动收紧间隔）
    // 子项级跳过：已滚出视口上方的子项保持静态可见（不注入动画初始态），首屏内与视口下方的子项保留滚动入场动画
    scope.querySelectorAll('[data-stagger]').forEach((container) => {
      const items = [...container.children].filter((el) => el.nodeType === 1)
      if (!items.length) return
      // 容器级可覆盖上限（data-stagger-limit），默认 STAGGER_LIMIT=6 克制化
      const limit = Number(container.dataset.staggerLimit) || STAGGER_LIMIT
      // 跳过动画的条目需还原隐藏态，避免深滚动恢复/焦点定位后条目透明不可见
      items.filter((el) => shouldSkip(el)).forEach((el) => gsap.set(el, { y: 0, opacity: 1 }))
      const animated = items.filter((el) => !shouldSkip(el)).slice(0, limit)
      if (!animated.length) return
      const step = Math.min(0.07, 1.1 / animated.length)
      gsap.fromTo(
        animated,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          ease: EASE_CARD,
          stagger: step,
          scrollTrigger: { trigger: animated[0], scroller: sc, start: 'top 88%', once: true },
        }
      )
    })

    // 单元素轻量进场
    scope.querySelectorAll('[data-reveal]').forEach((el) => {
      if (shouldSkip(el)) {
        gsap.set(el, { y: 0, opacity: 1 })
        return
      }
      gsap.fromTo(
        el,
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: EASE_CARD,
          scrollTrigger: { trigger: el, scroller: sc, start: 'top 90%', once: true },
        }
      )
    })

    // Markdown 正文图片：img reveal（轻微放大 + 淡入），figure 视差（滚动 scrub）
    scope.querySelectorAll('.md-figure').forEach((fig) => {
      if (shouldSkip(fig)) {
        const img = fig.querySelector('img')
        if (img) gsap.set(img, { scale: 1, opacity: 1 })
        return
      }
      const img = fig.querySelector('img')
      if (!img) return
      gsap.fromTo(
        img,
        { scale: 1.12, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.9,
          ease: EASE_CARD,
          scrollTrigger: { trigger: fig, scroller: sc, start: 'top 92%', once: true },
        }
      )
      gsap.fromTo(
        fig,
        { y: 26 },
        {
          y: -26,
          ease: 'none',
          scrollTrigger: { trigger: fig, scroller: sc, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
        }
      )
    })

    // 懒加载图片撑高布局后重算触发位置（去抖合并，避免滚动途中反复 refresh）
    scope.querySelectorAll('img').forEach((img) => {
      if (img.complete) return
      img.addEventListener('load', scheduleScrollRefresh, { once: true })
    })
  }, scope)

  return () => ctx.revert()
}

export { gsap, ScrollTrigger }
