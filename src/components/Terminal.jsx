import { useEffect, useRef, useState } from 'react'
import { runCommand, autocomplete } from '../terminal/commands.js'
import './Terminal.css'

const BANNER = [
  { text: '', cls: 'normal' },
  { text: '  ~/blog — 混合终端博客', cls: 'accent' },
  { text: '  xzx · 北京理工大学 自动化 · 机器人 / 运动控制 / 具身智能', cls: 'normal' },
  { text: '  ===============================================================', cls: 'muted' },
  { text: '  输入 help 查看可用命令', cls: 'muted' },
  { text: '', cls: 'normal' },
]

// 页面 → 终端路径：切换页面时 prompt 与标题随页面联动
const CWD_BY_TAB = {
  home: '~',
  blog: '~/posts',
  projects: '~/projects',
  about: '~/about',
}

// 表格不参与逐字打字（到达时整块浮现），只统计文本行
function countLineChars(line) {
  if (line.table) return 0
  return (line.text || '').length
}

// 短输出按 12-25ms/字符 打字；长输出自动提速，总时长控制在 3s 内
function typeDelay(total) {
  const ms = Math.min(3000, Math.max(900, total * 16)) / total
  return Math.max(4, Math.min(25, Math.round(ms)))
}

export default function Terminal({ activeTab, onNavigate, onEasterEgg, matrixActive, posts = [], projects = [], about = null }) {
  const [cwd, setCwd] = useState('~')
  const [blocks, setBlocks] = useState([])
  const [typing, setTyping] = useState(null) // { id, total, typed }
  const [history, setHistory] = useState([])
  const [value, setValue] = useState('')
  // 终端默认收起（所有屏宽），点击标题栏/三角展开
  const [collapsed, setCollapsed] = useState(true)
  // 用户手动调整的终端高度（null = 跟随 CSS 默认 250px / 45vh）
  const [termHeight, setTermHeight] = useState(null)
  const [resizing, setResizing] = useState(false)

  const termRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const histCursor = useRef(0)
  const draft = useRef('')
  const idRef = useRef(0)

  // 启动横幅 + 卸载清理
  useEffect(() => {
    setBlocks([{ id: idRef.current++, lines: BANNER }])
    return () => clearTimeout(timerRef.current)
  }, [])

  // 切换页面时，cwd 同步为页面对应路径（cd 仍可自由切换，切页后重置为页面路径）
  useEffect(() => {
    const p = CWD_BY_TAB[activeTab]
    if (p) setCwd(p)
  }, [activeTab])

  // 挂载后（或展开后）自动聚焦；收起时输入框隐藏，不聚焦
  useEffect(() => {
    if (!collapsed) inputRef.current?.focus()
  }, [collapsed])

  // 全局按键兜底：用户敲字时若焦点不在终端（且不在按钮/链接等控件上），自动聚焦终端
  // 这样即使误点到页面其他地方，也不需要再手动点击终端才能继续输入
  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key !== 'Enter' && e.key !== 'Backspace' && e.key.length !== 1) return
      const tag = document.activeElement ? document.activeElement.tagName : ''
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'].includes(tag)) return
      if (!collapsed && inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [collapsed])

  // 新输出自动滚到底部
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [blocks, typing])

  function typeBlock(block) {
    const total = block.lines.reduce((sum, l) => sum + countLineChars(l), 0)
    if (total <= 0) return
    clearTimeout(timerRef.current) // 新命令打断上一段还在播放的打字动画
    const delay = typeDelay(total)
    setTyping({ id: block.id, total, typed: 0 })
    let typed = 0
    const tick = () => {
      typed += 1
      if (typed >= total) {
        setTyping(null)
        return
      }
      setTyping({ id: block.id, total, typed })
      timerRef.current = setTimeout(tick, delay)
    }
    timerRef.current = setTimeout(tick, delay)
  }

  function handleChange(e) {
    const v = e.target.value
    setValue(v)
    draft.current = v
    histCursor.current = history.length
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (histCursor.current > 0) {
        histCursor.current -= 1
        setValue(history[histCursor.current])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histCursor.current < history.length) {
        histCursor.current += 1
        setValue(
          histCursor.current === history.length
            ? draft.current
            : history[histCursor.current],
        )
      }
    } else if (e.key === 'Tab') {
      // Tab 自动补全：单候选直接补全，多候选取公共前缀并列出候选
      e.preventDefault()
      const res = autocomplete(value)
      if (res.value && res.value !== value) {
        setValue(res.value)
        draft.current = res.value
        histCursor.current = history.length
      }
      if (res.matches && res.matches.length > 0) {
        const block = {
          id: idRef.current++,
          lines: [
            { text: '', cls: 'normal' },
            { text: `  ${res.matches.length} 个候选：`, cls: 'muted' },
            ...res.matches.map((m) => ({ text: `    ${m}`, cls: 'accent2' })),
            { text: '', cls: 'normal' },
          ],
        }
        setBlocks((prev) => [...prev, block])
        typeBlock(block)
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const raw = value
    if (!raw.trim()) return

    const nextHistory = [...history, raw]
    setHistory(nextHistory)
    histCursor.current = nextHistory.length
    draft.current = ''
    setValue('')

    const result = runCommand(raw, {
      cwd,
      setCwd,
      history: nextHistory,
      posts,
      projects,
      about,
      onNavigate,
      onEasterEgg,
      matrixActive,
    })
    const { lines, effect } = result || {}

    if (effect?.clear) {
      clearTimeout(timerRef.current)
      setTyping(null)
      setBlocks([])
      return
    }
    if (effect?.navigate) onNavigate?.(effect.navigate)
    if (effect?.easterEgg) onEasterEgg?.(effect.easterEgg)

    // 用户输入行立即回显（不参与打字），输出部分逐字打出
    const block = {
      id: idRef.current++,
      prompt: `xzx@blog:${cwd}$ ${raw}`,
      lines,
    }
    setBlocks((prev) => [...prev, block])
    typeBlock(block)
  }

  function renderTable(rows, key) {
    const cols = Math.max(1, ...rows.map((r) => r.length))
    return (
      <div
        className="term-table"
        key={key}
        style={{ gridTemplateColumns: `repeat(${cols}, max-content)` }}
      >
        {rows.map((row, ri) =>
          row.map((cell, ci) => (
            <span className={`term-cell${ri === 0 ? ' term-cell-head' : ''}`} key={`${ri}-${ci}`}>
              {String(cell)}
            </span>
          )),
        )}
      </div>
    )
  }

  function renderLine(line, key) {
    return (
      <div className={`term-line term-${line.cls || 'normal'}`} key={key}>
        {line.text}
      </div>
    )
  }

  function renderBlock(block) {
    const active = typing && typing.id === block.id
    let budget = active ? typing.typed : Infinity
    return (
      <div className="term-block" key={block.id}>
        {block.prompt ? <div className="term-line term-cmdline">{block.prompt}</div> : null}
        {block.lines.map((line, i) => {
          if (budget <= 0) return null
          if (line.table) return renderTable(line.table, `t${i}`)
          const len = (line.text || '').length
          if (budget >= len) {
            budget -= len
            return renderLine(line, `l${i}`)
          }
          const node = renderLine({ ...line, text: line.text.slice(0, budget) }, `l${i}`)
          budget = 0
          return node
        })}
      </div>
    )
  }

  const isTyping = typing !== null

  function toggleCollapsed() {
    setCollapsed((c) => !c)
  }

  // 拖拽标题栏上方的把手调整终端高度（120px ~ 72vh）
  const MIN_TERM_H = 120
  const maxTermH = () =>
    Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.72)

  function startResize(e) {
    if (e.button !== 0) return
    e.preventDefault()
    setResizing(true)
    const startY = e.clientY
    const startH = termRef.current ? termRef.current.offsetHeight : 250
    const onMove = (ev) => {
      const next = Math.min(maxTermH(), Math.max(MIN_TERM_H, startH + (startY - ev.clientY)))
      setTermHeight(next)
    }
    const onUp = () => {
      setResizing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      ref={termRef}
      className={`terminal${collapsed ? ' collapsed' : ''}${resizing ? ' resizing' : ''}`}
      style={!collapsed && termHeight ? { height: termHeight } : undefined}
      onClick={() => {
        if (!collapsed) inputRef.current?.focus()
      }}
    >
      <div
        className="term-resize"
        onPointerDown={startResize}
        title="拖动调整终端高度"
        aria-hidden="true"
      />
      <div
        className="term-titlebar"
        onClick={(e) => {
          e.stopPropagation()
          toggleCollapsed()
        }}
        title={collapsed ? '展开终端' : '收起终端'}
      >
        <span className="term-dots" aria-hidden="true">
          <i className="term-dot term-dot-one" />
          <i className="term-dot term-dot-two" />
          <i className="term-dot term-dot-three" />
        </span>
        <span className="term-title mono">xzx@blog: {cwd} — bash</span>
        <button
          type="button"
          className="term-toggle mono"
          aria-label={collapsed ? '展开终端' : '收起终端'}
          aria-expanded={!collapsed}
          onClick={(e) => {
            e.stopPropagation()
            toggleCollapsed()
          }}
        >
          {collapsed ? '▴' : '▾'}
        </button>
      </div>

      <div className="term-output mono" ref={scrollRef} aria-label="终端输出">
        {blocks.map(renderBlock)}
      </div>

      <form className="term-input-row mono" onSubmit={handleSubmit}>
        <span className="term-prompt">
          <span className="term-prompt-user">xzx@blog</span>
          <span>:</span>
          <span className="term-prompt-cwd">{cwd}</span>
          <span>$</span>
        </span>
        {!value && !isTyping ? <span className="term-cursor" aria-hidden="true" /> : null}
        <input
          ref={inputRef}
          className="term-input"
          name="terminal-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isTyping ? '…' : ''}
          spellCheck="false"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="终端输入"
          style={{ caretColor: value ? 'var(--accent)' : 'transparent' }}
        />
      </form>
    </div>
  )
}
