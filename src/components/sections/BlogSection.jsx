import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { posts } from '../../data/posts.js'
import { getViews, incrementViews } from '../../api.js'
import { GISCUS_CONFIG, giscusConfigured } from '../../giscusConfig.js'
import MarkdownBody from '../MarkdownBody.jsx'
// Giscus 仅在单篇视图渲染评论时按需加载，避免进首屏主包
const Giscus = lazy(() => import('@giscus/react'))

// 帖子信息行：浏览（异步真实值，失败降级 mock）/ 评论入口 / 点赞（本地 +1，刷新恢复初始）
// viewsOverride：单篇视图计数成功后由父组件传入的最新值，优先级最高
function PostMeta({ post, viewsOverride, onOpen }) {
  const [likes, setLikes] = useState(post.likes)
  const [liked, setLiked] = useState(false)
  const [views, setViews] = useState(null) // null = 加载中，显示 mock 值

  // 挂载时拉取真实浏览量；请求失败 / 返回 null 时保持降级显示 mock
  useEffect(() => {
    let alive = true
    getViews(post.id).then((data) => {
      if (alive && data && typeof data.views === 'number') setViews(data.views)
    })
    return () => {
      alive = false
    }
  }, [post.id])

  function handleLike() {
    if (liked) {
      setLikes((n) => n - 1)
      setLiked(false)
    } else {
      setLikes((n) => n + 1)
      setLiked(true)
    }
  }

  const displayViews = viewsOverride ?? views ?? post.views

  return (
    <div className="blog-post-meta">
      <span className="post-meta-views">浏览 {displayViews}</span>
      {onOpen && (
        <button type="button" className="post-meta-comments" onClick={() => onOpen(post.id)}>
          查看评论
        </button>
      )}
      <button
        type="button"
        className={`post-meta-like${liked ? ' is-liked' : ''}`}
        aria-pressed={liked}
        onClick={handleLike}
      >
        赞 {likes}
      </button>
    </div>
  )
}

// 列表卡片：日期 / 标题（点击进单篇视图）/ 标签 / 摘要 / 帖子信息
function BlogCard({ post, focused, onOpen }) {
  return (
    <article className={`blog-item${focused ? ' is-focused' : ''}`} id={`post-${post.id}`}>
      <div className="blog-card-head">
        <span className="blog-card-date mono">{post.date}</span>
        <button type="button" className="blog-card-title" onClick={() => onOpen(post.id)}>
          {post.title}
        </button>
      </div>

      <div className="blog-card-tags">
        {post.tags.map((tag) => (
          <span key={tag} className="chip">{tag}</span>
        ))}
      </div>

      <p className="blog-card-excerpt">{post.excerpt}</p>

      <PostMeta post={post} onOpen={onOpen} />
    </article>
  )
}

// 单篇视图：返回 / 大标题 / 日期标签 / Markdown 正文 / 帖子信息 / Giscus 评论区 + 右侧星点 TOC
function BlogSingle({ post, onBack }) {
  const [headings, setHeadings] = useState([]) // MarkdownBody 收集的 h2，用于 TOC
  const [views, setViews] = useState(post.views) // 计数后的最新浏览量（失败保持 mock）
  const [activeIdx, setActiveIdx] = useState(null) // 当前可见小节序号，驱动星点 TOC 高亮

  // 单篇阅读计数：同一浏览器会话只 +1 一次（sessionStorage 守卫），成功后刷新展示值
  useEffect(() => {
    const key = `viewed:${post.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    let alive = true
    incrementViews(post.id).then((data) => {
      if (alive && data && typeof data.views === 'number') setViews(data.views)
    })
    return () => {
      alive = false
    }
  }, [post.id])

  // 滚动监听：IntersectionObserver 标记当前可见小节，驱动星点 TOC 高亮（root 为内容滚动区）
  useEffect(() => {
    const root = document.querySelector('.content-area')
    if (!root || headings.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveIdx(Number(entry.target.id.split('-sec-').pop()))
        })
      },
      { root, rootMargin: '-15% 0px -70% 0px' }
    )
    headings.forEach((h) => {
      const el = document.getElementById(`${post.id}-sec-${h.index}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [headings, post.id])

  function scrollToSection(index) {
    const el = document.getElementById(`${post.id}-sec-${index}`)
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <article className="blog-single">
      <div className="blog-single-main">
        <button type="button" className="blog-back" onClick={onBack} data-reveal>
          ← 返回列表
        </button>

        <h2 className="blog-single-title" data-reveal-title>{post.title}</h2>

        <div className="blog-single-meta">
          <span className="blog-card-date mono">{post.date}</span>
          <div className="blog-card-tags">
            {post.tags.map((tag) => (
              <span key={tag} className="chip">{tag}</span>
            ))}
          </div>
        </div>

        {headings.length > 0 && (
          <nav className="blog-toc-bar" aria-label="目录">
            <span className="blog-toc-bar-label mono">toc</span>
            {headings.map((h) => (
              <button
                key={h.id}
                type="button"
                className="blog-toc-bar-item"
                onClick={() => scrollToSection(h.index)}
              >
                <span className="blog-toc-bar-index mono">{h.index}</span>
                {h.text}
              </button>
            ))}
          </nav>
        )}

        <MarkdownBody postId={post.id} markdown={post.content} onHeadings={setHeadings} />

        <PostMeta post={post} viewsOverride={views} />

        <div className="blog-comments-area">
          {giscusConfigured ? (
            <Suspense fallback={<p className="blog-giscus-hint">评论加载中…</p>}>
              <Giscus
                repo={GISCUS_CONFIG.repo}
                repoId={GISCUS_CONFIG.repoId}
                category={GISCUS_CONFIG.category}
                categoryId={GISCUS_CONFIG.categoryId}
                mapping={GISCUS_CONFIG.mapping}
                reactionsEnabled={GISCUS_CONFIG.reactionsEnabled}
                emitMetadata={GISCUS_CONFIG.emitMetadata}
                inputPosition={GISCUS_CONFIG.inputPosition}
                lang={GISCUS_CONFIG.lang}
                theme={GISCUS_CONFIG.theme}
              />
            </Suspense>
          ) : (
            <p className="blog-giscus-hint">
              评论功能需要将站点发布到公开 GitHub 仓库并配置 Giscus 后启用
            </p>
          )}
        </div>
      </div>

      {headings.length > 0 && (
        <aside className="blog-single-toc" aria-label="目录">
          <ul className="toc-stars">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className={`toc-star${activeIdx === h.index ? ' is-active' : ''}`}
                  onClick={() => scrollToSection(h.index)}
                >
                  <span className="toc-star-mark mono">✦</span>
                  <span className="toc-star-text">{h.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  )
}

export default function BlogSection({ focusId, resetSignal }) {
  const [flashId, setFlashId] = useState(null) // 短暂高亮中的条目 id
  const [query, setQuery] = useState('') // 搜索关键词
  const [activeTag, setActiveTag] = useState(null) // 激活的筛选标签
  const [selectedId, setSelectedId] = useState(null) // 正在单篇阅读的文章 id

  // 重复点击导航 posts（在单篇视图内）→ 清空选中，返回列表页
  useEffect(() => {
    if (resetSignal > 0) setSelectedId(null)
  }, [resetSignal])

  // 从首页跳转选中某篇：立即定位到该条并播放一次性高亮提示
  useEffect(() => {
    if (!focusId) return
    setFlashId(focusId)
    // 瞬时定位（不等淡入动画、不用 smooth），避免"先显示在上端再下跳"
    document.getElementById(`post-${focusId}`)?.scrollIntoView({ block: 'center' })
    const clearTimer = setTimeout(() => setFlashId(null), 3000)
    return () => clearTimeout(clearTimer)
  }, [focusId])

  // 进入单篇视图时回到内容区顶部
  useEffect(() => {
    if (selectedId) document.querySelector('.content-area')?.scrollTo(0, 0)
  }, [selectedId])

  const selectedPost = posts.find((p) => p.id === selectedId) || null

  // 标签筛选 + 搜索：标题或标签匹配（大小写不敏感）
  const allTags = useMemo(() => [...new Set(posts.flatMap((p) => p.tags))], [])
  const keyword = query.trim().toLowerCase()
  const filteredPosts = posts.filter((post) => {
    if (activeTag && !post.tags.includes(activeTag)) return false
    if (!keyword) return true
    return (
      post.title.toLowerCase().includes(keyword) ||
      post.tags.some((tag) => tag.toLowerCase().includes(keyword))
    )
  })

  function toggleTag(tag) {
    setActiveTag((cur) => (cur === tag ? null : tag))
  }

  function handleBack() {
    setSelectedId(null)
  }

  if (selectedPost) {
    return (
      <section aria-label="日志">
        <BlogSingle post={selectedPost} onBack={handleBack} />
      </section>
    )
  }

  return (
    <section aria-label="日志">
      <header className="section-head">
        <h2 className="section-title mono" data-reveal-title>~/posts</h2>
        <p className="section-desc" data-reveal>
          记录机器人、运动控制与具身智能路上的折腾、踩坑与顿悟。
        </p>
      </header>

      <div className="blog-toolbar" data-reveal>
        <input
          type="search"
          className="blog-search"
          placeholder="搜索文章…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="搜索文章"
        />
        <div className="blog-filter-chips">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`blog-filter-chip${tag === activeTag ? ' is-active' : ''}`}
              aria-pressed={tag === activeTag}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <p className="blog-empty">没有匹配的文章</p>
      ) : (
        <div className="blog-list" data-stagger>
          {filteredPosts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              focused={post.id === flashId}
              onOpen={setSelectedId}
            />
          ))}
        </div>
      )}
    </section>
  )
}
