// 浏览量统计服务（零依赖，Node 内置 http）
//   GET  /api/views/:postId  → { views }
//   POST /api/views/:postId  → 浏览量 +1 → { views }
// 数据持久化在 server/data/views.json（原子写，重启不丢）。
// 启动：npm run server（可用 PORT 环境变量改端口）
// 部署到树莓派/服务器：node server/index.js 或 pm2/systemd 托管。
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'views.json')
const PORT = Number(process.env.PORT) || 3210

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function save(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${DATA_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, DATA_FILE) // 原子替换，避免写一半损坏
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const m = url.pathname.match(/^\/api\/views\/([\w-]+)$/)
  const json = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(body))
  }

  if (!m) return json(404, { error: 'not found' })
  const id = m[1]
  const data = load()

  if (req.method === 'GET') return json(200, { views: data[id] || 0 })
  if (req.method === 'POST') {
    data[id] = (data[id] || 0) + 1
    save(data)
    return json(200, { views: data[id] })
  }
  return json(405, { error: 'method not allowed' })
})

server.listen(PORT, () => {
  console.log(`views server listening on http://localhost:${PORT}`)
})
