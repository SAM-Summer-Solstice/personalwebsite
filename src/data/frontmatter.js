// 轻量 frontmatter 解析：--- 分隔，支持 key: value / key: [a, b] / key: [JSON 数组]
export function parseFrontmatter(raw, sourcePath) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!m) throw new Error(`内容缺少 frontmatter：${sourcePath}`)
  const body = raw.slice(m[0].length)
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const rawVal = line.slice(idx + 1).trim()
    if (rawVal === '') {
      fm[key] = ''
      continue
    }
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      try {
        fm[key] = JSON.parse(rawVal)
      } catch {
        fm[key] = rawVal
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean)
      }
    } else {
      fm[key] = rawVal.replace(/^["']|["']$/g, '')
    }
  }
  return { fm, body: body.trim() }
}
