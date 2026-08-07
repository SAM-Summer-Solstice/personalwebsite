// 命令引擎：runCommand(raw, ctx) => { lines, effect }
// ctx: { cwd, setCwd, history, onNavigate?, onEasterEgg?, matrixActive? }
// lines 每行: { text, cls }（cls: normal|muted|accent|accent2|error|success|cmd|cmdline）
//          或 { table: [[列头], [行], ...] }
// effect: { navigate?: 'home'|'blog'|'projects'|'about',
//           easterEgg?: 'confetti'|'birthday'|'starfield'|'matrix', clear?: true }
import { posts } from '../data/posts.js'
import { projects } from '../data/projects.js'
import { about } from '../data/about.js'

const SESSION_START = Date.now()

const DIRS = {
  posts: '~/posts',
  projects: '~/projects',
  about: '~/about',
  secret: '~/secret',
}

const FORTUNES = [
  '人生苦短，PID 要调，参数直接上 4 位小数。',
  '没有 debug 不了的机器人，只有还没睡够的你。',
  '倒立摆教会我的第一课：重心不稳，一切都白搭。',
  '你的每一行代码，都可能是未来的坑，也可能是未来的桥。',
  '机器人的浪漫：我帮你扛住所有不确定性。',
  '凌晨三点的实验室，键盘声是最好的白噪音。',
]

const FILES = {
  'readme.md': [
    { text: '~/blog 是一个「混合终端」个人博客：上面是内容，下面是真终端。', cls: 'normal' },
    { text: '记录我在机器人、运动控制与具身智能路上的折腾、踩坑与顿悟。', cls: 'muted' },
    { text: '想要快速上手？输入 help 看看。', cls: 'muted' },
  ],
  'contact.txt': [
    { text: `邮箱：${about.contact.email}`, cls: 'normal' },
    { text: `GitHub：${about.contact.github}`, cls: 'normal' },
    { text: `城市：${about.contact.location}`, cls: 'normal' },
  ],
  'love_letter.txt': [
    { text: '亲爱的陌生人：', cls: 'normal' },
    { text: '', cls: 'normal' },
    { text: '如果你一路走到了这里，说明你还有好奇心。', cls: 'normal' },
    { text: '愿你的每一个 PID 都能收敛，愿你的每一个倒立摆都能站稳，', cls: 'normal' },
    { text: '愿你在深夜调试代码时，总有一盏灯为你亮着。', cls: 'normal' },
    { text: '', cls: 'normal' },
    { text: '—— xzx', cls: 'muted' },
  ],
}

// 粗略的显示宽度（CJK 按 2 个半角字符算），用于 cowsay 对齐
function dispWidth(str) {
  let w = 0
  for (const ch of String(str)) {
    w += /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]/.test(ch) ? 2 : 1
  }
  return w
}

function help() {
  const groups = [
    {
      name: '导航',
      items: [
        ['home', '回到首页'],
        ['posts', '文章列表，并跳转「日志」页'],
        ['blog', '→ 「posts」的别名'],
        ['projects', '项目列表，并跳转「项目」页'],
        ['about', '关于我，并跳转「关于」页'],
        ['contact', '联系方式，并跳转「关于」页'],
        ['email', '打印邮箱地址'],
        ['github', '打印 GitHub 主页'],
      ],
    },
    {
      name: '文件',
      items: [
        ['cd', '切换目录：posts / projects / about / secret'],
        ['ls', '列出当前目录内容'],
        ['pwd', '打印当前路径'],
        ['cat <file>', '查看文件内容'],
        ['nano <file>', '打开编辑器（真的能打开吗？）'],
      ],
    },
    {
      name: '系统',
      items: [
        ['clear', '清空屏幕'],
        ['ps', '查看进程'],
        ['date', '当前时间（Asia/Shanghai）'],
        ['whoami', '我是谁'],
        ['uptime', '运行时间'],
        ['echo <text>', '回显文本'],
        ['sudo', '试试管理员权限'],
        ['history', '查看命令历史'],
        ['uname', '系统信息'],
        ['ping', '网络连通性测试'],
        ['rm', '危险操作预警'],
        ['exit', '想退出终端？'],
      ],
    },
    {
      name: '主题',
      items: [
        ['dark', '查看当前主题（固定暗色）'],
        ['light', '浅色模式已被封印 ☕'],
      ],
    },
    {
      name: '趣味',
      items: [
        ['fortune', '随机一条程序员 / 机器人语录'],
        ['cowsay <text>', '让奶牛说句话'],
        ['matrix', '真相在屏幕之后'],
        ['生日', '生日快乐呀'],
        ['星空', '为你点亮夜空'],
        ['hi', '打个招呼'],
      ],
    },
  ]

  const lines = [
    { text: '可用命令（分组）：', cls: 'normal' },
    { text: '', cls: 'normal' },
  ]
  for (const g of groups) {
    lines.push({ text: `  ${g.name}`, cls: 'accent' })
    for (const [name, desc] of g.items) {
      lines.push({ text: `    ${name}`, cls: 'cmd' })
      lines.push({ text: `        ${desc}`, cls: 'muted' })
    }
    lines.push({ text: '', cls: 'normal' })
  }
  lines.push({
    text: '  · 还有一些隐藏惊喜，等你发现——试试 cd secret，或者对终端说点心里话？',
    cls: 'muted',
  })
  return { lines }
}

function clear() {
  return { lines: [], effect: { clear: true } }
}

function aboutCmd() {
  return {
    lines: [
      { text: '你好，我是 xzx，北京理工大学自动化学院大二学生，2006 年生。', cls: 'normal' },
      { text: '日常在电机、倒立摆、四足机器人与强化学习之间反复横跳。', cls: 'normal' },
      { text: '正在努力把「知行合一」从口号变成调试日志。', cls: 'muted' },
      { text: '（已为你打开「关于」页）', cls: 'success' },
    ],
    effect: { navigate: 'about' },
  }
}

function projectsCmd() {
  return {
    lines: [
      { text: `共 ${projects.length} 个项目：`, cls: 'muted' },
      ...projects.map((p) => ({ text: `  ${p.emoji} ${p.name} — ${p.tagline}`, cls: 'normal' })),
      { text: '（已为你打开「项目」页）', cls: 'success' },
    ],
    effect: { navigate: 'projects' },
  }
}

function postsCmd() {
  return {
    lines: [
      { text: `共 ${posts.length} 篇文章：`, cls: 'muted' },
      ...posts.map((p) => ({ text: `  ${p.date}  ${p.title}`, cls: 'normal' })),
      { text: '（已为你打开「日志」页）', cls: 'success' },
    ],
    effect: { navigate: 'blog' },
  }
}

function homeCmd() {
  return {
    lines: [{ text: '已回到 ~ — 博客首页', cls: 'success' }],
    effect: { navigate: 'home' },
  }
}

function contactCmd() {
  return {
    lines: [
      { text: `  邮箱：${about.contact.email}`, cls: 'normal' },
      { text: `  GitHub：${about.contact.github}`, cls: 'normal' },
      { text: `  城市：${about.contact.location}`, cls: 'normal' },
      { text: '（已为你打开「关于」页）', cls: 'success' },
    ],
    effect: { navigate: 'about' },
  }
}

function emailCmd() {
  return { lines: [{ text: `📧 ${about.contact.email}`, cls: 'accent2' }] }
}

function githubCmd() {
  return { lines: [{ text: `🐙 ${about.contact.github}`, cls: 'accent2' }] }
}

function cdCmd(arg, ctx) {
  const cwd = ctx.cwd || '~'
  const setCwd = ctx.setCwd || (() => {})
  const target = arg.trim()
  if (!target || target === '~' || target === '/') {
    setCwd('~')
    return {
      lines: [{ text: '已回到 ~', cls: 'muted' }],
      effect: { navigate: 'home' },
    }
  }
  if (target === '..') {
    if (cwd === '~') {
      return { lines: [{ text: '已经在根目录了，再往上就是地球 🌍', cls: 'muted' }] }
    }
    setCwd('~')
    return {
      lines: [{ text: '已回到 ~', cls: 'muted' }],
      effect: { navigate: 'home' },
    }
  }
  const key = target.replace(/^~\/?/, '').replace(/\/+$/, '')
  const dest = DIRS[key]
  if (!dest) {
    return { lines: [{ text: `cd: 没有这个目录：${arg}`, cls: 'error' }] }
  }
  setCwd(dest)
  const lines = [{ text: `已进入 ${dest}`, cls: 'muted' }]
  if (dest === '~/secret') {
    lines.unshift({ text: '这里好像藏了什么东西…试试 ls', cls: 'accent' })
    return { lines }
  }
  const navMap = { '~/posts': 'blog', '~/projects': 'projects', '~/about': 'about' }
  return { lines, effect: { navigate: navMap[dest] } }
}

function lsCmd(arg, ctx) {
  const cwd = ctx.cwd || '~'
  const lists = {
    '~': [
      { text: '  posts/', cls: 'accent' },
      { text: '  projects/', cls: 'accent' },
      { text: '  about/', cls: 'accent' },
      { text: '  readme.md', cls: 'muted' },
      { text: '  contact.txt', cls: 'muted' },
    ],
    '~/posts': posts.map((p) => ({ text: `  📄 ${p.title}`, cls: 'muted' })),
    '~/projects': projects.map((p) => ({ text: `  📦 ${p.name}`, cls: 'muted' })),
    '~/about': [
      { text: '  README.md', cls: 'muted' },
      { text: '  contact.txt', cls: 'muted' },
      { text: '  about.md', cls: 'muted' },
    ],
    '~/secret': [{ text: '  love_letter.txt', cls: 'accent' }],
  }
  return { lines: lists[cwd] || [{ text: '  （空的）', cls: 'muted' }] }
}

function pwdCmd(arg, ctx) {
  return { lines: [{ text: ctx.cwd || '~', cls: 'accent2' }] }
}

function catCmd(arg) {
  const f = arg.trim()
  if (!f) {
    return { lines: [{ text: '用法：cat <file>（试试 readme.md）', cls: 'error' }] }
  }
  if (f === '/dev/brain') {
    return { lines: [{ text: '/dev/brain: 设备忙，当前脑容量已被 PID 参数占用 80%', cls: 'muted' }] }
  }
  if (FILES[f]) return { lines: FILES[f] }
  return {
    lines: [
      { text: `cat: ${f}: 没有这个文件`, cls: 'error' },
      { text: '试试 readme.md 或 contact.txt', cls: 'muted' },
    ],
  }
}

function nanoCmd() {
  return { lines: [{ text: 'nano 只读模式暂不可用，用鼠标点点点吧 😄', cls: 'muted' }] }
}

function psCmd() {
  return {
    lines: [
      {
        table: [
          ['PID', 'USER', 'CPU', 'MEM', 'COMMAND'],
          ['1', 'xzx', '0.1', '0.4', 'this-blog'],
          ['2', 'xzx', '0.0', '0.1', 'terminal-console'],
          ['3', 'root', '0.3', '0.2', 'confetti-engine'],
          ['4', 'root', '0.0', '0.0', 'sudo-approval'],
          ['5', 'xzx', '12.0', '1.1', 'pid-loop @1kHz'],
          ['6', 'xzx', '0.6', '0.3', 'gait-planner (trot)'],
          ['7', 'root', '1.0', '0.5', 'easter-egg-daemon'],
        ],
      },
      { text: '（以上进程一切正常，除了 PID 4 永远在排队）', cls: 'muted' },
    ],
  }
}

function dateCmd() {
  const now = new Date()
  const df = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'full' })
  const tf = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', timeStyle: 'medium', hour12: false })
  return { lines: [{ text: `${df.format(now)} ${tf.format(now)}（Asia/Shanghai）`, cls: 'normal' }] }
}

function whoamiCmd() {
  return {
    lines: [
      { text: 'xzx — 北京理工大学 自动化学院 · 大二 · 2006 年生', cls: 'normal' },
      { text: '（系统提示：以上信息由本机唯一管理员提供，真实可信）', cls: 'muted' },
    ],
  }
}

function uptimeCmd() {
  const s = Math.floor((Date.now() - SESSION_START) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return {
    lines: [
      { text: ` 已运行 ${h} 小时 ${m} 分 ${sec} 秒（从本页打开那一刻算起，别笑）`, cls: 'normal' },
      { text: ' 负载 0.42 · 温度 36.6℃ · 情绪稳定', cls: 'muted' },
    ],
  }
}

function echoCmd(arg) {
  return { lines: [{ text: arg, cls: 'normal' }] }
}

function sudoCmd() {
  return {
    lines: [
      { text: '你并没有管理员权限 😜', cls: 'error' },
      { text: '该请求已加入 sudo-approval 队列，预计排队 114514 年，请耐心等待。', cls: 'muted' },
    ],
  }
}

function darkCmd() {
  return { lines: [{ text: '已经是暗色模式啦 ☕（本站唯一的主题，安心用）', cls: 'success' }] }
}

function lightCmd() {
  return { lines: [{ text: '想切浅色？本站只提供暗色模式，浅色配色已被封印 ☕', cls: 'muted' }] }
}

function fortuneCmd() {
  const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
  return { lines: [{ text: `💬 ${f}`, cls: 'normal' }] }
}

function cowsayCmd(arg) {
  const words = (arg.trim() || 'hello, world').replace(/\s+/g, ' ')
  const w = Math.max(dispWidth(words), 8)
  const border = '─'.repeat(w + 2)
  const cow = [
    '        \\   ^__^',
    '         \\  (oo)\\_______',
    '            (__)\\       )\\/\\',
    '                ||----w |',
    '                ||     ||',
  ]
  return {
    lines: [
      { text: ` ${border} `, cls: 'normal' },
      { text: `< ${words}${' '.repeat(w - dispWidth(words))} >`, cls: 'normal' },
      { text: ` ${border} `, cls: 'normal' },
      ...cow.map((t) => ({ text: t, cls: 'muted' })),
    ],
  }
}

function matrixCmd(arg, ctx) {
  const on = Boolean(ctx.matrixActive)
  return {
    lines: on
      ? [{ text: '矩阵雨已关闭，现实恢复正常 🌫️', cls: 'success' }]
      : [{ text: '真相在屏幕之后…（再输入一次 matrix 可关闭）', cls: 'accent' }],
    effect: { easterEgg: 'matrix' },
  }
}

function birthdayCmd() {
  return {
    lines: [
      { text: '🎂 生日快乐！', cls: 'accent' },
      { text: '愿新的一岁：所有轨迹都收敛，所有步态都稳定，所有 bug 都一夜消失。', cls: 'normal' },
    ],
    effect: { easterEgg: 'birthday' },
  }
}

function starCmd() {
  return {
    lines: [{ text: '夜空已为你点亮 ✨', cls: 'accent' }],
    effect: { easterEgg: 'starfield' },
  }
}

function confettiCmd() {
  return { lines: [{ text: '🎉', cls: 'accent' }], effect: { easterEgg: 'confetti' } }
}

function historyCmd(arg, ctx) {
  const h = ctx.history || []
  if (!h.length) {
    return { lines: [{ text: '历史记录空空如也，快输入点什么吧', cls: 'muted' }] }
  }
  return {
    lines: h.map((c, i) => ({ text: `  ${String(i + 1).padStart(3, ' ')}  ${c}`, cls: 'normal' })),
  }
}

function unameCmd() {
  return {
    lines: [
      { text: 'Linux blog-server 6.6.1-arch1-1 #1 SMP PREEMPT_DYNAMIC x86_64', cls: 'normal' },
      { text: '（别当真，这其实是一台运行在浏览器里的 React 主机）', cls: 'muted' },
    ],
  }
}

function pingCmd() {
  return {
    lines: [
      { text: 'PING xzx.blog (127.0.0.1) 56(84) bytes of data.', cls: 'normal' },
      { text: '64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.042 ms', cls: 'normal' },
      { text: '64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.038 ms', cls: 'normal' },
      { text: '64 bytes from 127.0.0.1: icmp_seq=3 ttl=64 time=0.051 ms', cls: 'normal' },
      { text: '', cls: 'normal' },
      { text: '--- xzx.blog ping statistics ---', cls: 'muted' },
      { text: '3 packets transmitted, 3 received, 0% packet loss', cls: 'muted' },
      { text: '（这个延迟比你上次回消息的时间短多了）', cls: 'muted' },
    ],
  }
}

function rmCmd(arg) {
  if (!arg.trim()) {
    return { lines: [{ text: '用法：rm <file>——算了，我建议你别用', cls: 'muted' }] }
  }
  return {
    lines: [
      { text: `rm -rf ${arg} 已被拦截：这位同学冷静一下，你的博客还想多活几年。`, cls: 'error' },
      { text: '（开个玩笑，这里删不了任何东西）', cls: 'muted' },
    ],
  }
}

function exitCmd() {
  return { lines: [{ text: 'exit: 终端是博客的一部分，你走不了的 😄', cls: 'muted' }] }
}

function hiCmd() {
  return {
    lines: [
      { text: 'hi！我是 xzx，欢迎光临。', cls: 'normal' },
      { text: '想聊点什么？试试 help，或者直接对终端说点心里话 ❤', cls: 'muted' },
    ],
  }
}

const COMMANDS = {
  help,
  clear,
  about: aboutCmd,
  projects: projectsCmd,
  posts: postsCmd,
  blog: postsCmd,
  home: homeCmd,
  contact: contactCmd,
  email: emailCmd,
  github: githubCmd,
  cd: cdCmd,
  ls: lsCmd,
  pwd: pwdCmd,
  cat: catCmd,
  nano: nanoCmd,
  ps: psCmd,
  date: dateCmd,
  whoami: whoamiCmd,
  uptime: uptimeCmd,
  echo: echoCmd,
  sudo: sudoCmd,
  dark: darkCmd,
  light: lightCmd,
  fortune: fortuneCmd,
  cowsay: cowsayCmd,
  matrix: matrixCmd,
  生日: birthdayCmd,
  星空: starCmd,
  star: starCmd,
  confetti: confettiCmd,
  history: historyCmd,
  uname: unameCmd,
  ping: pingCmd,
  rm: rmCmd,
  exit: exitCmd,
  hi: hiCmd,
}

export function runCommand(raw, ctx = {}) {
  const input = String(raw || '').trim()
  if (!input) return { lines: [] }

  // 表白彩蛋：输入含「喜欢」或「爱」
  if (/喜欢|爱/.test(input)) {
    return {
      lines: [
        { text: '呀，被你发现了…（心跳 +1）❤', cls: 'accent' },
        { text: '这句话我已经收进 ~/secret/love_letter.txt 的回执里了。', cls: 'muted' },
      ],
      effect: { easterEgg: 'confetti' },
    }
  }

  const [cmd, ...rest] = input.split(/\s+/)
  const arg = rest.join(' ')
  const handler = COMMANDS[cmd]
  if (!handler) {
    return {
      lines: [
        { text: `bash: ${cmd}: command not found`, cls: 'error' },
        { text: '输入 help 查看可用命令', cls: 'muted' },
      ],
    }
  }
  return handler(arg, ctx)
}

/* ── Tab 自动补全 ───────────────────────────────── */
const CD_DIRS = ['posts', 'projects', 'about', 'secret', '~']
const CAT_FILES = ['readme.md', 'contact.txt', 'love_letter.txt', '/dev/brain']

// 单候选直接补全（命令后带空格）；多候选取公共前缀并返回候选列表
function completeWord(partial, candidates, baseInput, appendSpace) {
  const found = candidates.filter((c) => c.startsWith(partial)).sort()
  if (!found.length) return { value: baseInput, matches: [] }
  if (found.length === 1) {
    const prefix = baseInput.slice(0, baseInput.length - partial.length)
    return { value: prefix + found[0] + (appendSpace ? ' ' : ''), matches: [] }
  }
  let common = found[0]
  for (let i = 1; i < found.length; i++) {
    const f = found[i]
    let j = 0
    while (j < common.length && j < f.length && common[j] === f[j]) j++
    common = common.slice(0, j)
  }
  const prefix = baseInput.slice(0, baseInput.length - partial.length)
  return { value: prefix + common, matches: found }
}

export function autocomplete(raw) {
  const input = String(raw || '')
  const parts = input.split(/\s+/)
  const partial = parts[parts.length - 1] || ''
  const cmd = parts[0] || ''
  const allCommands = Object.keys(COMMANDS)
  if (parts.length === 1) return completeWord(partial, allCommands, input, true)
  if (cmd === 'cd') return completeWord(partial, CD_DIRS, input, true)
  if (cmd === 'cat') return completeWord(partial, CAT_FILES, input, true)
  return completeWord(partial, allCommands, input, true)
}
