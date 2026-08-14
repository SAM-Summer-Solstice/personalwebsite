// 内容数据 hooks：从 Django API 拉取数据（fail-open，加载失败返回空数组 / null）。
// 统一封装 loading 状态，各 section 按需消费，不再依赖构建期的文件批量打包。
import { useEffect, useState } from 'react'
import { getPosts, getPost, getProjects, getAbout, getUsers } from '../api.js'

// 数据就绪信号：数据 setState 完成后广播，ContentArea 收到后（防抖合并）触发页面滚动动效初始化，
// 保证 initPageMotion 在异步子项渲染完成之后执行，避免 stagger 动画因子项缺失而无法创建
// （导出供各 section 复用：数据在 AppShell 已缓存、切页挂载时不会再触发 hook 的 ready 广播，
// 此时由 section 主动广播，否则元素被 hideMotionElements 隐藏后无人恢复，出现"整页内容不可见"）
export function notifyContentReady() {
  window.dispatchEvent(new CustomEvent('app:content-ready'))
}

// 文章列表（按日期倒序，无正文）
export function usePosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    getPosts().then((data) => {
      if (!alive) return
      setPosts(data || [])
      setLoading(false)
      notifyContentReady()
    })
    return () => {
      alive = false
    }
  }, [])
  return { posts, loading }
}

// 单篇文章（含 content Markdown 正文）；id 变化时重新拉取
export function usePost(id) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    getPost(id).then((data) => {
      if (!alive) return
      setPost(data)
      setLoading(false)
      notifyContentReady()
    })
    return () => {
      alive = false
    }
  }, [id])
  return { post, loading }
}

// 项目列表
export function useProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    getProjects().then((data) => {
      if (!alive) return
      setProjects(data || [])
      setLoading(false)
      notifyContentReady()
    })
    return () => {
      alive = false
    }
  }, [])
  return { projects, loading }
}

// 关于页数据（初始 null，加载中为 null）
export function useAbout() {
  const [about, setAbout] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    getAbout().then((data) => {
      if (!alive) return
      setAbout(data)
      setLoading(false)
      notifyContentReady()
    })
    return () => {
      alive = false
    }
  }, [])
  return { about, loading }
}

// 注册用户墙（用户名 + 评论数）
export function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    getUsers().then((data) => {
      if (!alive) return
      setUsers(data || [])
      setLoading(false)
      notifyContentReady()
    })
    return () => {
      alive = false
    }
  }, [])
  return { users, loading }
}
