# Tasks

- [x] Task 1: 初始化 React + Vite 项目
  - [x] SubTask 1.1: 在 `d:\xzx\JUST_FOR_FUN\github\personalwebsite` 初始化 Vite + React 项目，清理默认模板
  - [x] SubTask 1.2: 引入 JetBrains Mono web 字体（回退系统等宽），配置 CSS 变量（#1A1C1E / #E4E4E7 / #D4A373 / #8BB3A0 / #0F1113）
  - [x] SubTask 1.3: 建立组件目录结构：`components/`（Navbar、ContentArea、Terminal、EasterEggs 等）、`data/`（占位文章、项目、个人简介）

- [x] Task 2: 实现主内容区（图形化博客）
  - [x] SubTask 2.1: 固定顶栏：网站名 `~/blog`、导航标签（日志 / 项目 / 关于）、实时当前时间
  - [x] SubTask 2.2: 「日志」模块：文章列表（标题 + 日期），点击展开 / 收起全文
  - [x] SubTask 2.3: 「项目」模块：卡片网格（图片占位、名称、简述），点击展开详情
  - [x] SubTask 2.4: 「关于」模块：头像占位、个人介绍、联系方式、项目数据、学习方向、博客初衷
  - [x] SubTask 2.5: 模块间淡入切换、悬停上浮 + 边框高亮反馈；版心约 1700px 居中

- [x] Task 3: 实现终端区
  - [x] SubTask 3.1: 底部固定终端窗口（红黄绿装饰点、底色 #0F1113、细亮边框），终端内容区 + 输入行
  - [x] SubTask 3.2: 命令解析器：必须命令 `help / clear / about / projects / blog / contact / email / github / cd / ls / ps / cat / nano`
  - [x] SubTask 3.3: 创意命令：`date / whoami / uptime / echo / sudo / dark / light / fortune / cowsay / matrix / 生日 / 星空` 等
  - [x] SubTask 3.4: 交互：上下键历史、自动聚焦（加载后 + 点击终端区域）、错误命令友好提示、可滚动输出
  - [x] SubTask 3.5: 输出支持彩色 / 简单表格 / 局部粗体大小变化；打字机效果渲染新输出

- [x] Task 4: 终端与主内容联动
  - [x] SubTask 4.1: `blog / projects / contact / about` 等导航命令执行时，终端输出信息并切换主内容区模块（高亮对应导航标签）
  - [x] SubTask 4.2: `help / date` 等非导航命令仅终端内响应

- [x] Task 5: 彩蛋系统
  - [x] SubTask 5.1: 表白关键词触发（含「喜欢」或「爱」字眼）：屏幕左右两侧五彩纸屑 / 彩带炸开，数秒后自动消失
  - [x] SubTask 5.2: `生日` 生日祝福动画；`星空` 星空背景切换；`sudo` 权限梗提示
  - [x] SubTask 5.3: 额外趣味彩蛋（如 `matrix` 雨效果），确保不影响正常使用

- [x] Task 6: 响应式适配与视觉打磨
  - [x] SubTask 6.1: PC 端底部终端栏（高约 200~280px），主内容版心约 1700px
  - [x] SubTask 6.2: 窄屏（手机）终端收缩为可展开 / 收起面板，主内容滚动流畅
  - [x] SubTask 6.3: 整体视觉检查：字体 ≥16px、行距 ≥1.8、动画速度适中、无溢出 / 滚动条问题

- [x] Task 7: 运行验证
  - [x] SubTask 7.1: 安装依赖并启动 `npm run dev`，浏览器验证页面正常渲染、终端命令与彩蛋可用
  - [x] SubTask 7.2: 执行 `npm run build` 确认可构建，修复报错（补充了缺失的 package.json scripts 字段）

# Task Dependencies
- [Task 2] 依赖 [Task 1]
- [Task 3] 依赖 [Task 1]
- [Task 4] 依赖 [Task 2]、[Task 3]
- [Task 5] 依赖 [Task 3]
- [Task 6] 依赖 [Task 2]、[Task 3]、[Task 5]
- [Task 7] 依赖 [Task 6]
