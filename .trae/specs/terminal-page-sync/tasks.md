# Tasks

- [x] Task 1: cwd 随页面联动
  - [x] SubTask 1.1: `App.jsx` 向 `<Terminal>` 传入 `activeTab={activeTab}`
  - [x] SubTask 1.2: `Terminal.jsx` 接收 `activeTab`，定义页面→路径映射（CWD_BY_TAB：home→~ / blog→~/posts / projects→~/projects / about→~/about），`useEffect([activeTab])` 同步 `setCwd`
- [x] Task 2: 默认收起 + 标题联动
  - [x] SubTask 2.1: `Terminal.jsx` `collapsed` 初始值改为始终 `true`（移除 innerWidth 判断）
  - [x] SubTask 2.2: 标题栏由硬编码 `xzx@blog: ~ — bash` 改为 `xzx@blog: {cwd} — bash`，随 cwd 实时更新
- [x] Task 3: 构建与验证
  - [x] SubTask 3.1: `npm run build` 通过
  - [x] SubTask 3.2: dev 验证要点：CWD_BY_TAB 四路径映射、effect 依赖 activeTab、cd 命令未动（仍可自由切换）、收起默认 true、全局按键已有 `!collapsed` 守卫

# Task Dependencies
- [Task 2] 依赖 [Task 1]（cwd 联动后标题才有意义）
- [Task 3] 依赖 [Task 1]、[Task 2]
