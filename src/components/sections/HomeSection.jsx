import { useLayoutEffect } from 'react'
import { useAbout, usePosts, useProjects, useUsers, notifyContentReady } from '../../data/useContent.js'
import { resolveMediaUrl } from '../../api.js'
import './HomeSection.css'

export default function HomeSection({ onNavigate }) {
  // 数据由 API 提供；loading 期间为空数组 / null，组件结构不变
  const { posts, loading: postsLoading } = usePosts()
  const { projects, loading: projectsLoading } = useProjects()
  const { about, loading: aboutLoading } = useAbout()
  const { users, loading: usersLoading } = useUsers()
  const recentPosts = posts.slice(0, 3)
  const featuredProjects = projects.slice(0, 3)
  const a = about || {} // 加载中降级为空对象，避免访问字段报错

  // 数据已在缓存（切页回到首页）时主动广播 content-ready，触发动效初始化，
  // 否则首页元素会停留在 hideMotionElements 注入的隐藏态（与 posts 列表同类问题）
  const ready = !postsLoading && !projectsLoading && !aboutLoading && !usersLoading
  useLayoutEffect(() => {
    if (ready) notifyContentReady()
  }, [ready])

  return (
    <section className="home-section" aria-label="首页">

      <header className="home-head">
        <h2 className="home-title mono">~</h2>
        <p className="home-subtitle">{a.homeTagline || '你好，很高兴在这里遇见你'}</p>
      </header>

      {/* 首页极简 hero：只留欢迎语 + 一句话简介，欢迎语后台可编辑，详细个人资料在 about 页 */}
      <div className="home-hero">
        <h1 className="home-welcome">
          {a.homeWelcome || '欢迎来到我的小站'}
          <span className="home-cursor" aria-hidden="true">▍</span>
        </h1>
        <p className="home-desc">{(a.intro || [])[0]}</p>
      </div>

      <div className="home-block">
        <h3 className="home-section-title mono home-title-accent" data-reveal-title>用户墙</h3>
        <div className="home-users" data-stagger>
          {users.map((u) => (
            <div key={u.username} className="home-user" title={u.username}>
              {u.avatar ? (
                <img
                  className="home-user-avatar"
                  src={resolveMediaUrl(u.avatar)}
                  alt={u.username}
                  loading="lazy"
                />
              ) : (
                <span className="home-user-avatar is-fallback mono" aria-hidden="true">
                  {(u.username || '').slice(0, 1).toUpperCase()}
                </span>
              )}
              {/* hover 才显示用户名与评论数，默认保持纯头像墙 */}
              <span className="home-user-name">{u.username}</span>
              <span className="home-user-comments mono">{u.comment_count} 条评论</span>
            </div>
          ))}
          {!users.length && <p className="home-users-empty">还没有注册用户，来抢第一个吧</p>}
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
    </section>
  )
}
