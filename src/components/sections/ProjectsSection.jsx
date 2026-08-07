import { useEffect, useState } from 'react'
import { projects } from '../../data/projects.js'
import ProjectsNetwork from './ProjectsNetwork.jsx'

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
  const [flashId, setFlashId] = useState(null) // 短暂高亮中的条目 id

  // 从首页跳转选中某个项目：立即定位到该条并播放一次性高亮提示
  useEffect(() => {
    if (!focusId) return
    setFlashId(focusId)
    // 瞬时定位（不等淡入动画、不用 smooth），避免"先显示在上端再下跳"
    document.getElementById(`project-${focusId}`)?.scrollIntoView({ block: 'center' })
    const clearTimer = setTimeout(() => setFlashId(null), 3000)
    return () => clearTimeout(clearTimer)
  }, [focusId])

  // 按日期从新到旧排序
  const sorted = [...projects].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <section aria-label="项目">
      <header className="section-head">
        <h2 className="section-title mono">~/projects</h2>
        <p className="section-desc">
          折腾过的一些硬件与软件项目。
        </p>
      </header>

      <ProjectsNetwork projects={projects} />

      <div className="projects-list">
        {sorted.map((project) => (
          <ProjectItem key={project.id} project={project} focused={project.id === flashId} />
        ))}
      </div>
    </section>
  )
}
