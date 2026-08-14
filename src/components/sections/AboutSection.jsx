import { lazy, Suspense, useLayoutEffect, useRef } from 'react'
import { useAbout, notifyContentReady } from '../../data/useContent.js'
import { resolveMediaUrl } from '../../api.js'
// Lanyard（drei + rapier + meshline + GLB）较重，仅进入 about 页时按需加载
const Lanyard = lazy(() => import('../Lanyard.jsx'))
import { hideMotionElements } from '../../motion/usePageMotion.js'

export default function AboutSection() {
  // 数据由 API 提供；加载中渲染占位，就绪后渲染原结构
  const { about } = useAbout()
  const rootRef = useRef(null)

  // 异步数据提交 DOM 后、浏览器绘制前，立即注入动效隐藏初始态，
  // 消除"内容先显示 → 防抖后再隐藏 → 滚动进场"的 FOUC 闪动（幂等，可重复调用）
  useLayoutEffect(() => {
    if (rootRef.current) hideMotionElements(rootRef.current)
    // 数据已在缓存（切页进入 about）时主动广播 content-ready 触发动效初始化，
    // 否则内容会停留在隐藏初始态（与 posts 列表同类问题）
    if (about) notifyContentReady()
  }, [about])

  if (!about) {
    return (
      <section ref={rootRef} aria-label="关于">
        <div className="about-layout">
          <div className="about-main">
            <header className="section-head">
              <h2 className="section-title mono" data-reveal-title>~/about</h2>
              <p className="section-desc">加载中…</p>
            </header>
          </div>
          <aside className="about-side" aria-label="3D 挂绳吊牌">
            <div className="about-side-placeholder" aria-hidden="true" />
          </aside>
        </div>
      </section>
    )
  }

  return (
    <section ref={rootRef} aria-label="关于">
      <div className="about-layout">
        <div className="about-main" data-stagger data-stagger-limit="8">
          <header className="section-head">
            <h2 className="section-title mono" data-reveal-title>~/about</h2>
            <p className="section-desc">关于我，以及这个博客为什么存在。</p>
          </header>

          <div className="about-header">
            <h3 className="about-name" data-reveal-title>{about.name}</h3>
            <p className="about-meta">
              {about.school} · {about.grade} · 出生于
              <span className="mono"> {about.birthYear} </span>
              年
            </p>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">个人介绍</h4>
            {(about.intro || []).map((para, i) => (
              <p key={i} className="about-paragraph">{para}</p>
            ))}
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">学习方向</h4>
            <div className="direction-chips">
              {(about.directions || []).map((dir) => (
                <span key={dir} className="chip">{dir}</span>
              ))}
            </div>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">兴趣爱好</h4>
            <ul className="interest-list">
              {(about.interests || []).map((item) => (
                <li key={item} className="chip">{item}</li>
              ))}
            </ul>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">一些数据</h4>
            <p className="about-stats-line">
              {(about.stats || []).map((stat, i) => (
                <span key={stat.label}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  <span className="stat mono">{stat.value}</span> {stat.label}
                </span>
              ))}
            </p>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">联系方式</h4>
            <div className="contact-list">
              <div className="contact-item mono">
                <span className="contact-label">email</span> · {about.contact?.email}
              </div>
              <div className="contact-item mono">
                <span className="contact-label">github</span> · {about.contact?.github}
              </div>
              <div className="contact-item mono">
                <span className="contact-label">location</span> · {about.contact?.location}
              </div>
            </div>
          </div>

          <div className="about-section">
            <h4 className="about-section-title mono">博客初衷</h4>
            {(about.blogPurpose || []).map((para, i) => (
              <p key={i} className="about-paragraph">{para}</p>
            ))}
          </div>
        </div>

        <aside className="about-side" aria-label="3D 挂绳吊牌">
          <Suspense fallback={<div className="about-side-placeholder" aria-hidden="true" />}>
            {/* 三图由后台 about 接口下发（lanyardImage / cardFrontImage / cardBackImage），未上传时走内置默认 */}
            <Lanyard
              position={[0, 0, 20]}
              gravity={[0, -40, 0]}
              lanyardImage={resolveMediaUrl(about.lanyardImage)}
              frontImage={resolveMediaUrl(about.cardFrontImage)}
              backImage={resolveMediaUrl(about.cardBackImage)}
            />
          </Suspense>
        </aside>
      </div>
    </section>
  )
}
