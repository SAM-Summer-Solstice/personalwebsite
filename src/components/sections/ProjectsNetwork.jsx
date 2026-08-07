// 项目知识网络：3D 星图（three + r3f + drei）
//   - 节点按 fibonaci 球面分布；每帧按与相机距离缩放/明暗（depth cue），旋转时纵深变化明显
//   - 状态三色（已完成/进行中/规划中）；related 画无向连线（去重）
//   - 默认不显示名称：悬停节点时显示 tooltip
//   - OrbitControls：按住拖拽任意方向旋转（带阻尼惯性）、滚轮缩放、autoRotate 缓慢自转（reduced-motion 关闭）
// 窄屏（≤768px）降级：隐藏 3D，仅展示一行项目名
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

const STATUS_COLOR = {
  已完成: '#6FBFC9', // --accent-2
  进行中: '#A79BF0', // --accent
  规划中: '#9CA3AF', // --text-muted
}
const EDGE_COLOR = '#8E8CD5' // 呼应背景波浪，低透明度细线
const tmpVec = new THREE.Vector3()

// fibonaci 球面均布点，保证任意数量节点在球面分布均匀
function spherePositions(count, radius) {
  const pts = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = count > 1 ? 1 - (i / (count - 1)) * 2 : 0
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    pts.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius))
  }
  return pts
}

// 节点：按深度缩放与明暗，旋转时"近大远小"，更接近真实的星图纵深
function StarNode({ position, color, name, hovered, onHover, onLeave }) {
  const mesh = useRef()
  const mat = useRef()

  useFrame(({ camera }) => {
    if (!mesh.current || !mat.current) return
    mesh.current.getWorldPosition(tmpVec)
    const d = tmpVec.distanceTo(camera.position)
    const s = THREE.MathUtils.clamp(2.3 - d * 0.18, 0.7, 1.9)
    mesh.current.scale.setScalar(s)
    mat.current.opacity = THREE.MathUtils.clamp(1.25 - d * 0.1, 0.35, 1)
  })

  return (
    <mesh ref={mesh} position={position} onPointerOver={onHover} onPointerOut={onLeave}>
      <sphereGeometry args={[0.16, 20, 20]} />
      <meshBasicMaterial ref={mat} color={color} transparent />
      {hovered && (
        <Html center position={[0, 0.55, 0]} distanceFactor={5} zIndexRange={[50, 0]}>
          <span className="network-tooltip mono">{name}</span>
        </Html>
      )}
    </mesh>
  )
}

function NetworkScene({ projects }) {
  const [hovered, setHovered] = useState(null)
  const positions = useMemo(() => spherePositions(projects.length, 3.2), [projects])
  const posById = useMemo(
    () => Object.fromEntries(projects.map((p, i) => [p.id, positions[i]])),
    [projects, positions]
  )

  // related → 无向边，去重
  const edges = useMemo(() => {
    const list = []
    const seen = new Set()
    for (const p of projects) {
      for (const rId of p.related) {
        const key = [p.id, rId].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        const a = posById[p.id]
        const b = posById[rId]
        if (a && b) list.push([a, b])
      }
    }
    return list
  }, [projects, posById])

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <>
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={3.2}
        maxDistance={11}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reduceMotion}
        autoRotateSpeed={0.5}
      />
      {edges.map(([a, b], i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.35} />
        </line>
      ))}
      {projects.map((p, i) => (
        <StarNode
          key={p.id}
          position={positions[i]}
          color={STATUS_COLOR[p.status] || STATUS_COLOR['规划中']}
          name={p.name}
          hovered={hovered === p.id}
          onHover={(e) => {
            e.stopPropagation()
            setHovered(p.id)
          }}
          onLeave={() => setHovered((cur) => (cur === p.id ? null : cur))}
        />
      ))}
    </>
  )
}

export default function ProjectsNetwork({ projects }) {
  return (
    <div className="projects-network">
      <div className="network-3d" role="img" aria-label="项目之间的关联关系网络（拖拽旋转，滚轮缩放，悬停节点显示名称）">
        <Canvas camera={{ position: [0, 0, 6.5], fov: 45 }} dpr={[1, 2]}>
          <NetworkScene projects={projects} />
        </Canvas>
      </div>

      {/* 窄屏降级：只留一行项目名 */}
      <div className="network-inline" role="img" aria-label="项目之间的关联关系网络">
        {projects.map((p) => (
          <span key={p.id} className="network-inline-node mono">
            {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}
