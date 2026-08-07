# Tasks

- [x] Task 1: 导航与入口状态改造
  - [x] SubTask 1.1: `src/App.jsx` 的 `activeTab` 初始值改为 `'home'`，类型注释加入 `'home'`
  - [x] SubTask 1.2: `src/components/Navbar.jsx` 站点名 `~/blog` 改为可点击按钮（`onNavigate('home')`，带 aria-label）；标签保持 `posts / projects / about`；`src/components/Navbar.css` 增加 logo 按钮样式（无边框、accent 色、hover 反馈），首页时标签不高亮（现有 is-active 逻辑天然满足）
  - [x] SubTask 1.3: `src/components/ContentArea.jsx` 增加 `activeTab === 'home'` 渲染 HomeSection 的分支（HomeSection 先以占位组件接入）

- [x] Task 2: 实现 HomeSection 首页组件
  - [x] SubTask 2.1: 新建 `src/components/sections/HomeSection.jsx`：大字号姓名（读 about.name）、一句话定位（用 about.intro 首段或专门字段）、学习方向标签（about.directions，复用 .chip 纯文字样式）
  - [x] SubTask 2.2: 最近文章预览（posts 前 3 篇，日期 + 标题，点击通过 props 回调切到 'blog'）与精选项目预览（projects 前 2-3 个，名称 + 状态点，点击切到 'projects'）
  - [x] SubTask 2.3: 联系方式一行（email / github / location，读 about.contact）；排版大而疏、纯文字无卡片
  - [x] SubTask 2.4: 样式（独立 HomeSection.css，类名前缀 `home-`）：超大标题层级、行距充足、错落淡入动画（每项 animation-delay 递增），`@media (prefers-reduced-motion: reduce)` 下禁用动画
  - [x] SubTask 2.5: 确保 HomeSection 独立组件 + 独立样式，可整段替换为 React Bits 组件而不牵连其他代码

- [x] Task 3: 终端命令与虚拟文件系统统一改造
  - [x] SubTask 3.1: `src/terminal/commands.js` 新增 `posts` 命令（原 blogCmd 内容，跳转 'blog' 页）；`blog` 改为 `posts` 的别名（同一 handler）
  - [x] SubTask 3.2: 虚拟目录调整：`~` 为根；`posts` → `~/posts`、`projects` → `~/projects`、`about` → `~/about`、`secret` → `~/secret`；`cd posts|projects|about` 联动切页；`cd` / `cd ~` / `cd ..` 回 `~` 并联动回首页；`cd` 到 secret 保持彩蛋提示
  - [x] SubTask 3.3: `ls` 按目录正确列出：根列出 `posts/ projects/ about/ readme.md contact.txt`（secret 隐藏）；子目录列对应内容
  - [x] SubTask 3.4: 新增 `home` 命令（跳转 'home'）；`help` 导航分组更新为 `home / posts / projects / about / contact / email / github`，并标注 `blog` 为 `posts` 别名
  - [x] SubTask 3.5: `src/components/Terminal.jsx` cwd 初始值改为 `~`；验证 `effect.navigate` 对 'home' 的链路
  - [x] SubTask 3.6: 各 section 小节标题改为与路径一致：BlogSection `~/posts`、ProjectsSection `~/projects`、AboutSection `~/about`；首页标题 `~`

- [x] Task 4: 运行验证
  - [x] SubTask 4.1: `npm run build` 构建通过
  - [x] SubTask 4.2: `npm run dev` 启动后浏览器确认：默认显示首页；点 logo 回首页；标签 posts/projects/about 与终端 `posts/projects/about` 命名一致且均能跳转；`blog` 别名可用；`cd` 进子目录联动切页、`cd`/`cd ~`/`cd ..` 回首页；`ls` 输出与页面结构一致

# Task Dependencies
- [Task 2] 依赖 [Task 1]（ContentArea 接入 HomeSection）
- [Task 3] 依赖 [Task 1]（navigate 链路就绪）
- [Task 4] 依赖 [Task 2]、[Task 3]
