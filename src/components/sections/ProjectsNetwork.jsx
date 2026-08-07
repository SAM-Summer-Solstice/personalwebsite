// 知识网络：每个项目一个节点，related 关系画无向连线（a→b 与 b→a 只画一条）
// 纯 SVG 实现：环形布局，节点 = 圆点 + emoji + 名称；连线 = 底色 + 流动虚线
// 窄屏（≤768px）降级：隐藏连线 SVG，仅展示一行项目节点
export default function ProjectsNetwork({ projects }) {
  // 画布与环形布局参数（6 节点不重叠的经验值）
  const W = 840
  const H = 370
  const CX = W / 2
  const CY = H / 2
  const R = 150

  // 节点位置：均布在圆环上，从正上方开始
  const positions = {}
  projects.forEach((p, i) => {
    const angle = (2 * Math.PI * i) / projects.length - Math.PI / 2
    positions[p.id] = {
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
    }
  })

  // related 生成无向边并去重；端点不存在（悬空 id）则跳过
  const edges = []
  const seen = new Set()
  for (const p of projects) {
    for (const rId of p.related) {
      const key = [p.id, rId].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      const a = positions[p.id]
      const b = positions[rId]
      if (a && b) edges.push({ a, b })
    }
  }

  return (
    <div className="projects-network">
      <svg
        className="network-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="项目之间的关联关系网络"
      >
        <g className="network-edges">
          {edges.map((e, i) => (
            <g key={i}>
              <line className="network-link-base" x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} />
              <line className="network-link-flow" x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} />
            </g>
          ))}
        </g>
        {projects.map((p) => (
          <g key={p.id} className="network-node" transform={`translate(${positions[p.id].x} ${positions[p.id].y})`}>
            <circle r={12} />
            <text className="mono" y={30}>
              {p.emoji} {p.name}
            </text>
          </g>
        ))}
      </svg>

      {/* 窄屏降级：只留一行节点 */}
      <div className="network-inline" role="img" aria-label="项目之间的关联关系网络">
        {projects.map((p) => (
          <span key={p.id} className="network-inline-node mono">
            {p.emoji} {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}
