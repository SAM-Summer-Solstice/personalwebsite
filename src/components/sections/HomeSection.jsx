import { about } from '../../data/about.js'
import { posts } from '../../data/posts.js'
import { projects } from '../../data/projects.js'
import './HomeSection.css'

const recentPosts = posts.slice(0, 3)
const featuredProjects = projects.slice(0, 3)

export default function HomeSection({ onNavigate }) {
  return (
    <section className="home-section" aria-label="首页">

      <header className="home-head">
        <h2 className="home-title mono">~</h2>
        <p className="home-subtitle">欢迎来到我的博客</p>
      </header>

      <div className="home-hero">
        <h1 className="home-name">
          {about.name}
          <span className="home-cursor" aria-hidden="true">▍</span>
        </h1>
        <p className="home-meta mono">
          {about.school} · {about.grade} · 出生于 {about.birthYear} 年
        </p>
        <p className="home-desc">{about.intro[0]}</p>
        <div className="home-chips">
          {about.directions.map((dir) => (
            <span key={dir} className="home-chip mono">{dir}</span>
          ))}
        </div>
      </div>

      <div className="home-block">
        <h3 className="home-section-title mono home-title-accent" data-reveal-title>最近文章</h3>
        <div className="home-list" data-stagger>
          {recentPosts.map((post) => (
            <div key={post.id} className="home-item">
              <span className="home-item-date mono">{post.date}</span>
              <button
                type="button"
                className="home-item-title"
                onClick={() => onNavigate('blog', post.id)}
              >
                {post.title}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="home-block">
        <h3 className="home-section-title mono" data-reveal-title>精选项目</h3>
        <div className="home-list" data-stagger>
          {featuredProjects.map((project) => {
            const done = project.status === '已完成'
            return (
              <div key={project.id} className="home-item">
                <button
                  type="button"
                  className="home-item-title"
                  onClick={() => onNavigate('projects', project.id)}
                >
                  {project.name}
                </button>
                <span className={`home-project-status mono${done ? ' done' : ' doing'}`}>
                  {project.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <footer className="home-contact mono" data-reveal>
        {about.contact.email} · {about.contact.github} · {about.contact.location}
      </footer>
    </section>
  )
}
