import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 注意：不要用 React.StrictMode——它会双重挂载 <Canvas>，
// 导致 @react-three/fiber 的渲染循环停止，Dither 背景变成一帧静态画面。
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
