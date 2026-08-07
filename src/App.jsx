import { useState } from 'react'
import Navbar from './components/Navbar.jsx'
import ContentArea from './components/ContentArea.jsx'
import Terminal from './components/Terminal.jsx'
import EasterEggs from './components/EasterEggs.jsx'
import Dither from './components/Dither.jsx'

export default function App() {
  const [activeTab, setActiveTab] = useState('home') // 'home' | 'blog' | 'projects' | 'about'
  const [focusId, setFocusId] = useState(null) // 从首页跳转时选中的条目 id，用于目标页高亮提示
  const [confettiKey, setConfettiKey] = useState(0) // >0 时播放彩带，自增重播
  const [birthday, setBirthday] = useState(false)
  const [starfield, setStarfield] = useState(false)
  const [matrix, setMatrix] = useState(false)

  function handleEasterEgg(type) {
    if (type === 'confetti') setConfettiKey((k) => k + 1)
    else if (type === 'birthday') setBirthday(true)
    else if (type === 'starfield') setStarfield((s) => !s)
    else if (type === 'matrix') setMatrix((m) => !m)
  }

  // 统一导航入口：普通跳转只传 tab；从首页选中条目跳转时附带上该条 id
  function handleNavigate(tab, id) {
    setActiveTab(tab)
    setFocusId(id || null)
  }

  function handleOverlayDone(kind) {
    if (kind === 'confetti') setConfettiKey(0)
    else if (kind === 'birthday') setBirthday(false)
  }

  return (
    <>
      <div className="bg-dither" aria-hidden="true">
        <Dither
          waveColor={[0.5568627450980392, 0.5490196078431373, 0.8352941176470589]}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.8}
          colorNum={25}
          waveAmplitude={0.31}
          waveFrequency={4.3}
          waveSpeed={0.45}
        />
      </div>
      <div className="app">
        <Navbar activeTab={activeTab} onNavigate={handleNavigate} />
        <ContentArea activeTab={activeTab} onNavigate={handleNavigate} focusId={focusId} />
        <Terminal onNavigate={handleNavigate} onEasterEgg={handleEasterEgg} matrixActive={matrix} />
        <EasterEggs
          confettiKey={confettiKey}
          birthday={birthday}
          starfield={starfield}
          matrix={matrix}
          onOverlayDone={handleOverlayDone}
        />
      </div>
    </>
  )
}
