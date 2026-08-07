import { useEffect, useMemo, useRef } from 'react'
import './EasterEggs.css'

const CONFETTI_COLORS = ['#A79BF0', '#6FBFC9', '#FFD166', '#EF476F', '#6EC1E4', '#FF9F1C', '#C77DFF']
const CONFETTI_EMOJI = ['🎉', '✨', '💖']
// 形状权重：矩形居多，圆点、细长彩带、emoji 点缀
const CONFETTI_SHAPES = ['rect', 'rect', 'rect', 'rect', 'circle', 'ribbon', 'emoji']

function rand(min, max) {
  return Math.random() * (max - min) + min
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1))
}

function pickShape() {
  return CONFETTI_SHAPES[randInt(0, CONFETTI_SHAPES.length - 1)]
}

/* ── 表白彩带：左右两侧同时炸开，自然飘落 ─────────── */
function ConfettiBurst({ onDone }) {
  const particles = useMemo(() => {
    const count = randInt(90, 110)
    return Array.from({ length: count }, (_, i) => {
      const fromLeft = i % 2 === 0 // 一半从左、一半从右
      const shape = pickShape()
      const dir = fromLeft ? 1 : -1 // 向左抛为正、向右抛为负
      const baseTx = dir * rand(8, 22) // 净水平漂移（vw）
      const tx = (k) => (baseTx * k).toFixed(1) + 'vw'
      const ty = (v) => v.toFixed(1) + 'vh'
      const p = {
        fromLeft,
        shape,
        color: CONFETTI_COLORS[randInt(0, CONFETTI_COLORS.length - 1)],
        top: rand(8, 66).toFixed(1) + '%',
        delay: rand(0, 0.45) + 's',
        dur: rand(3.6, 4.8) + 's',
        // 六段轨迹：抛出（向上向内）→ 顶点 → 左右摇摆下落 → 飘出屏外
        tx1: tx(0.45), ty1: ty(-rand(16, 26)), r1: randInt(40, 160) + 'deg',
        tx2: tx(1.0), ty2: ty(-rand(2, 9)), r2: randInt(120, 280) + 'deg',
        tx3: tx(0.6), ty3: ty(rand(8, 16)), r3: randInt(200, 420) + 'deg',
        tx4: tx(1.3), ty4: ty(rand(18, 28)), r4: randInt(300, 560) + 'deg',
        tx5: tx(0.9), ty5: ty(rand(30, 46)), r5: randInt(380, 720) + 'deg',
      }
      if (p.shape === 'emoji') {
        p.emoji = CONFETTI_EMOJI[randInt(0, CONFETTI_EMOJI.length - 1)]
      } else if (p.shape === 'ribbon') {
        p.w = randInt(4, 6)
        p.h = randInt(18, 26)
      } else if (p.shape === 'circle') {
        p.w = p.h = randInt(6, 10)
      } else {
        p.w = randInt(6, 10)
        p.h = randInt(10, 16)
      }
      return p
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(onDone, 5300)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="ee-confetti-layer">
      {particles.map((p, i) => (
        <span
          key={i}
          className={`ee-confetti ee-confetti-${p.shape}${p.shape === 'emoji' ? ' ee-confetti-emoji' : ''}`}
          style={{
            '--tx1': p.tx1, '--ty1': p.ty1, '--r1': p.r1,
            '--tx2': p.tx2, '--ty2': p.ty2, '--r2': p.r2,
            '--tx3': p.tx3, '--ty3': p.ty3, '--r3': p.r3,
            '--tx4': p.tx4, '--ty4': p.ty4, '--r4': p.r4,
            '--tx5': p.tx5, '--ty5': p.ty5, '--r5': p.r5,
            '--delay': p.delay,
            '--dur': p.dur,
            '--color': p.color,
            '--w': p.w + 'px',
            '--h': p.h + 'px',
            top: p.top,
            [p.fromLeft ? 'left' : 'right']: '-20px',
          }}
        >
          {p.shape === 'emoji' ? p.emoji : null}
        </span>
      ))}
      <span className="ee-confetti-text">🎉 好啦，要一直开心哦</span>
    </div>
  )
}

/* ── 生日祝福：居中卡片 + 环绕装饰 ────────────────── */
function BirthdayOverlay({ onDone }) {
  const deco = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        emoji: ['💖', '✨', '🎈', '💕', '⭐'][randInt(0, 4)],
        left: rand(2, 96) + '%',
        top: rand(6, 88) + '%',
        size: randInt(14, 28) + 'px',
        delay: rand(0, 1.2) + 's',
        dur: rand(2.2, 4.0) + 's',
      })),
    [],
  )

  useEffect(() => {
    const t = setTimeout(onDone, 5600)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="ee-birthday-layer">
      {deco.map((d, i) => (
        <span
          key={i}
          className="ee-birthday-deco"
          style={{
            left: d.left,
            top: d.top,
            fontSize: d.size,
            animationDelay: d.delay,
            animationDuration: d.dur,
          }}
        >
          {d.emoji}
        </span>
      ))}
      <div className="ee-birthday-card">
        <div className="ee-birthday-cake">🎂</div>
        <h2 className="ee-birthday-title">生日快乐！</h2>
        <p className="ee-birthday-msg">愿新的一岁：所有轨迹都收敛，所有步态都稳定，所有 bug 都一夜消失 ✨</p>
      </div>
    </div>
  )
}

/* ── 星空背景：内容之后、body 背景之上 ─────────────── */
function Starfield() {
  const stars = useMemo(() => {
    const count = randInt(90, 120)
    return Array.from({ length: count }, () => {
      const big = Math.random() < 0.08
      const size = big ? rand(3, 5) : rand(1, 3)
      return {
        left: rand(0, 100) + '%',
        top: rand(0, 100) + '%',
        size,
        color: ['#ffffff', '#fff5e0', '#ffe9c4', '#eaf6ff'][randInt(0, 3)],
        delay: rand(0, 4) + 's',
        dur: rand(2.2, 4.6) + 's',
        glow: big ? `0 0 ${randInt(6, 14)}px rgba(255, 255, 255, 0.5)` : 'none',
      }
    })
  }, [])

  return (
    <div className="ee-starfield">
      {stars.map((s, i) => (
        <span
          key={i}
          className={`ee-star${s.glow !== 'none' ? ' ee-star-big' : ''}`}
          style={{
            left: s.left,
            top: s.top,
            width: s.size + 'px',
            height: s.size + 'px',
            background: s.color,
            animationDelay: s.delay,
            animationDuration: s.dur,
            boxShadow: s.glow,
          }}
        />
      ))}
    </div>
  )
}

/* ── 矩阵雨：canvas 绿色字符流 ────────────────────── */
const MATRIX_CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/*+-='

function MatrixRain() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const fontSize = 16
    const drops = [] // 每列当前行索引（可为负，让雨滴从屏幕上方错落进入）
    let raf = 0

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cols = Math.ceil(window.innerWidth / fontSize)
      for (let i = drops.length; i < cols; i++) drops[i] = Math.random() * -30
      drops.length = cols
    }

    function draw() {
      // 用 destination-out 渐隐上一帧，保持背景透明、页面可见
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)
      ctx.globalCompositeOperation = 'source-over'

      ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`
      for (let i = 0; i < drops.length; i++) {
        const ch = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
        ctx.fillStyle = Math.random() > 0.975 ? '#aaffc8' : 'rgba(0, 255, 70, 0.9)'
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > window.innerHeight && Math.random() > 0.975) drops[i] = 0
        else drops[i] += 1
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="ee-matrix" />
}

export default function EasterEggs({ confettiKey, birthday, starfield, matrix, onOverlayDone }) {
  return (
    <>
      {confettiKey > 0 && (
        <ConfettiBurst key={confettiKey} onDone={() => onOverlayDone('confetti')} />
      )}
      {birthday && <BirthdayOverlay onDone={() => onOverlayDone('birthday')} />}
      {starfield && <Starfield />}
      {matrix && <MatrixRain />}
    </>
  )
}
