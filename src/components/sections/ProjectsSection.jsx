import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProjects } from '../../data/useContent.js'
import { hideMotionElements } from '../../motion/usePageMotion.js'
// ProjectsNetwork（three + drei TrackballControls）较重，仅进入 projects 页时按需加载
const ProjectsNetwork = lazy(() => import('./ProjectsNetwork.jsx'))

function ProjectItem({ project, focused }) {
  const [open, setOpen] = useState(false)

  // 状态三态：已完成 / 进行中 / 规划中
  const statusClass =
    project.status === '已完成' ? 'done' : project.status === '进行中' ? 'doing' : 'planning'

  // 从首页跳转选中时自动展开，让用户一眼看到"选择的是这一条"
  useEffect(() => {
    if (focused) setOpen(true)
  }, [focused])

  return (
    <div
      className={`project-item${focused ? ' is-focused' : ''}`}
      id={`project-${project.id}`}
    >
      <button
        type="button"
        className="project-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="project-head">
          <h3 className="project-name">{project.name}</h3>
          <span className={`project-status mono ${statusClass}`}>{project.status}</span>
          <span className="project-date mono">{project.date}</span>
        </div>

        <p className="project-tagline">{project.tagline}</p>

        <div className="project-tech mono">{project.tech.join(' · ')}</div>
      </button>

      {(project.url || project.github) && (
        <div className="project-links mono">
          {project.url && (
            <a className="project-link" href={project.url} target="_blank" rel="noreferrer">
              demo →
            </a>
          )}
          {project.github && (
            <a className="project-link" href={project.github} target="_blank" rel="noreferrer">
              github →
            </a>
          )}
        </div>
      )}

      <div className={`expander${open ? ' is-open' : ''}`}>
        <div className="expander-inner">
          <p className="project-detail">{project.description}</p>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsSection({ focusId }) {
  // 数据由 API 提供；loading 期间为空数组（星图与列表为空），排序逻辑保留
  const { projects, loading } = useProjects()
  const [flashId, setFlashId] = useState(null) // 短暂高亮中的条目 id
  const [showLabels, setShowLabels] = useState(false) // 3D 星图全部节点名称常显开关
  const overviewRef = useRef(null)
  const rootRef = useRef(null)

  // 星图 canvas 在可视范围内时，概览侧栏与其等高对齐；滚出视口后恢复自然高度。
  // 直接用 classList 切换，避免触发 React 重渲染干扰 Canvas，保证过渡平滑。
  useEffect(() => {
    const net = document.querySelector('.projects-network .network-3d')
    const aside = overviewRef.current
    const root = document.querySelector('.content-area')
    if (!net || !aside || !root) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => aside.classList.toggle('is-aligned', entry.isIntersecting))
      },
      { root, threshold: 0 }
    )
    observer.observe(net)
    return () => observer.disconnect()
  }, [])

  // 从首页跳转选中某个项目：播放一次性高亮提示
  useEffect(() => {
    if (!focusId) return
    setFlashId(focusId)
    const clearTimer = setTimeout(() => setFlashId(null), 3000)
    return () => clearTimeout(clearTimer)
  }, [focusId])

  // 焦点滚动：等数据渲染完成后再定位（挂载时数据异步加载、元素尚不存在，直接 scrollIntoView 会静默失效）
  const focusScrolledRef = useRef(false)
  useEffect(() => {
    if (!focusId || loading || focusScrolledRef.current) return
    const el = document.getElementById(`project-${focusId}`)
    if (!el) return
    focusScrolledRef.current = true
    const area = document.querySelector('.content-area')
    if (!area) return
    const top = el.getBoundingClientRect().top - area.getBoundingClientRect().top + area.scrollTop
    area.scrollTop = Math.max(0, top - area.clientHeight / 2 + el.offsetHeight / 2)
  }, [focusId, loading, projects])

  // 异步项目数据渲染提交后（绘制前）立即隐藏动效元素初始态，消除"先显示→消失→再动画"窗口
  useLayoutEffect(() => {
    if (rootRef.current) hideMotionElements(rootRef.current)
  }, [projects])

  // 按日期从新到旧排序
  const sorted = [...projects].sort((a, b) => new Date(b.date) - new Date(a.date))

  // 概览侧栏数据：状态计数 / 技术栈聚合 / 最近在做（数据未就绪时兜底为空）
  const doneCount = projects.filter((p) => p.status === '已完成').length
  const doingCount = projects.filter((p) => p.status === '进行中').length
  const planningCount = projects.filter((p) => p.status === '规划中').length
  const techs = [...new Set(projects.flatMap((p) => p.tech))].slice(0, 8)
  const latest = sorted[0]

  return (
    <section ref={rootRef} aria-label="项目">
      <div className="projects-page">
        <div className="projects-main">
          <header className="section-head">
            <h2 className="section-title mono" data-reveal-title>~/projects</h2>
            <div className="section-desc-row" data-reveal>
              <p className="section-desc">
                折腾过的一些硬件与软件项目。
              </p>
              <button
                type="button"
                className="network-labels-btn mono"
                onClick={() => setShowLabels((v) => !v)}
              >
                {showLabels ? 'hide labels' : 'show labels'}
              </button>
            </div>
          </header>

          <div className="projects-network-wrap" data-reveal>
            <Suspense fallback={<div className="network-3d" aria-hidden="true" />}>
              <ProjectsNetwork projects={projects} showLabels={showLabels} />
            </Suspense>
          </div>

          <div className="projects-list" data-stagger>
            {sorted.map((project) => (
              <ProjectItem key={project.id} project={project} focused={project.id === flashId} />
            ))}
          </div>
        </div>

        <aside ref={overviewRef} className="projects-overview" aria-label="项目概览">
          <h3 className="overview-title mono">~/projects</h3>

          <dl className="overview-stats">
            <div className="overview-stat">
              <dt className="mono done">done</dt>
              <dd className="mono">{doneCount}</dd>
            </div>
            <div className="overview-stat">
              <dt className="mono doing">doing</dt>
              <dd className="mono">{doingCount}</dd>
            </div>
            <div className="overview-stat">
              <dt className="mono planning">planning</dt>
              <dd className="mono">{planningCount}</dd>
            </div>
          </dl>

          <div className="overview-block">
            <h4 className="overview-label mono">tech</h4>
            <p className="overview-tech mono">{techs.join(' · ')}</p>
          </div>

          <div className="overview-block">
            <h4 className="overview-label mono">now</h4>
            <p className="overview-now mono">{latest?.name}</p>
            <p className="overview-now-tag">{latest?.tagline}</p>
          </div>
        </aside>
      </div>
    </section>
  )
}
