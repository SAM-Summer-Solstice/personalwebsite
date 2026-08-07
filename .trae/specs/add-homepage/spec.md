# 首页 Homepage Spec

## Why
当前站点加载后直接展示日志列表，缺少"我是谁"的第一印象。需要一个以视觉冲击为先的首页作为默认入口：简约大气、酷且高雅。同时，导航标签、终端命令与虚拟文件系统三者目前命名不一致（标签 `posts` 但命令是 `blog`；页面标题 `~/blog/posts` 但虚拟目录是 `~/projects`），需要统一。

## What Changes
- 新增 `home` 视图作为默认加载入口：`activeTab` 增加 `'home'` 取值，初始值改为 `'home'`。
- 新增 HomeSection 组件（纯文字驱动）：大字号姓名 + 一句话定位 + 方向标签 + 最近文章 / 精选项目预览 + 联系方式，无卡片、无头像、无渐变贴图。
- 命名统一：导航标签与终端导航命令统一为 `posts / projects / about`；`blog` 命令保留为 `posts` 的别名（满足原必须命令清单）。
- 虚拟文件系统与站点结构严格一致：
  - `~` = 博客根 = 首页；站点名 `~/blog` 是品牌名（等价于根，仅作展示）。
  - 目录结构：`~/posts`、`~/projects`、`~/about`、`~/secret`（隐藏彩蛋目录）。
  - 各页面小节标题改为与路径一致：`~/posts`、`~/projects`、`~/about`；首页为 `~`。
  - 终端提示符随 cwd 显示当前路径；`ls` 按当前目录正确列出；`cd` 进入子目录联动切换到对应页面，`cd` / `cd ~` / `cd ..` 回到 `~` 并联动回首页。
- Navbar：站点名 `~/blog` 变为可点击入口（点击返回首页）；标签 `posts / projects / about` 在首页时不激活任何一项。
- 首页动效：元素错落淡入（约 0.5s 内渐次出现），尊重 `prefers-reduced-motion`，不使用打扰性动画。
- 结构约定（为后续 React Bits 模板预留余地）：所有页面 / UI 片段保持"独立组件 + 独立样式"的组织方式（类名带组件前缀），后续可把任意单个片段（hero、列表项、导航等）直接替换为 React Bits 组件，不影响 App 状态与终端联动。

## Impact
- 受影响代码：
  - `src/App.jsx`：初始 `activeTab` 改为 `'home'`。
  - `src/components/Navbar.jsx` / `Navbar.css`：logo 变为返回首页的按钮，首页时无激活标签。
  - `src/components/ContentArea.jsx`：渲染 HomeSection。
  - 新增 `src/components/sections/HomeSection.jsx`（独立样式、类名前缀 `home-`）。
  - `src/components/sections/BlogSection.jsx` / `ProjectsSection.jsx` / `AboutSection.jsx`：小节标题改为 `~/posts`、`~/projects`、`~/about`。
  - `src/terminal/commands.js`：命令统一、虚拟文件系统路径调整、`blog` 别名、`home` 命令、help 更新。
  - `src/components/Terminal.jsx`：cwd 初始值改为 `~`（验证既有联动链路）。
- 受影响能力：导航、终端联动、虚拟文件系统、内容区渲染。

## ADDED Requirements

### Requirement: 首页视图
系统 SHALL 以 `home` 作为默认加载视图，而不是直接展示日志列表。

#### Scenario: 打开站点
- **WHEN** 用户访问站点
- **THEN** 默认显示首页（大字号姓名、一句话定位、方向标签、预览与联系方式），日志列表不再自动展示

#### Scenario: 首页内容
- **WHEN** 用户停留在首页
- **THEN** 能看到：姓名与身份、一句话定位、学习方向标签、最近 3 篇文章标题预览、精选 2-3 个项目名预览、邮箱 / GitHub / 城市联系方式，全部为纯文字排版、无卡片容器

### Requirement: 导航返回首页
系统 SHALL 提供返回首页的入口：点击顶栏站点名 `~/blog` 回到首页；首页状态下 posts/projects/about 三个标签均不高亮。

#### Scenario: 点击站点名
- **WHEN** 用户在任意页面点击 `~/blog`
- **THEN** 内容区回到首页

#### Scenario: 首页高亮
- **WHEN** 用户位于首页
- **THEN** 导航中没有任何标签处于激活态

### Requirement: 命名统一
系统 SHALL 保持导航标签、终端导航命令与虚拟目录三者命名一致：均为 `posts / projects / about`；`blog` 命令作为 `posts` 的别名保留并可正常使用。

#### Scenario: 标签与命令一致
- **WHEN** 用户在导航看到 `posts / projects / about`，或在终端输入 `posts`、`projects`、`about`
- **THEN** 均能跳转到对应页面，且命名完全一致

#### Scenario: blog 别名
- **WHEN** 用户在终端输入 `blog`
- **THEN** 行为与 `posts` 相同（跳转文章列表页），`help` 中标注其为别名

### Requirement: 虚拟文件系统与页面结构一致
系统 SHALL 让虚拟文件系统与真实页面结构一一对应：`~` 为博客根（首页），子目录 `~/posts`、`~/projects`、`~/about`、`~/secret` 分别对应各页面；终端提示符、`ls` 输出、`cd` 结果均正确反映当前页面层级。

#### Scenario: 根目录
- **WHEN** 用户在首页（cwd 为 `~`）执行 `ls`
- **THEN** 列出 `posts/`、`projects/`、`about/`、`readme.md`、`contact.txt`（`secret/` 隐藏，需 `cd secret` 进入）

#### Scenario: 进入子目录
- **WHEN** 用户在终端输入 `cd posts`（或 `projects` / `about`）
- **THEN** cwd 变为 `~/posts`（提示符同步显示），主内容区联动切换到对应页面，`ls` 列出该目录内容（文章/项目标题等）

#### Scenario: 返回根目录
- **WHEN** 用户在子目录输入 `cd` / `cd ~` / `cd ..`
- **THEN** cwd 回到 `~`，主内容区联动回到首页

#### Scenario: 页面标题与路径一致
- **WHEN** 用户浏览任一页面
- **THEN** 该页小节标题与虚拟路径一致（`~/posts`、`~/projects`、`~/about`，首页为 `~`）

### Requirement: 终端联动首页
系统 SHALL 让终端可以返回首页：`home` 命令、`cd`（无参或 `cd ~`）、子目录 `cd ..` 都会切换到首页。

#### Scenario: 输入 home
- **WHEN** 用户在终端输入 `home`
- **THEN** 终端输出一行提示，主内容区切换到首页

#### Scenario: cd 回根目录
- **WHEN** 用户在终端输入 `cd` 或 `cd ~`
- **THEN** 虚拟路径回到 `~`，主内容区切换到首页

### Requirement: 首页动效
系统 SHALL 让首页元素在加载时错落淡入（短时、克制），并在 `prefers-reduced-motion` 下退化为无动画直接显示。

#### Scenario: 加载首页
- **WHEN** 首页元素首次出现
- **THEN** 元素依次淡入上移，约 0.5s 内完成，不循环不打扰

#### Scenario: 系统减弱动效
- **WHEN** 用户系统开启"减弱动态效果"
- **THEN** 首页元素直接显示，无过渡动画

### Requirement: 组件可替换性（为 React Bits 预留）
系统 SHALL 将首页及现有 UI 片段组织为高内聚、低耦合的独立组件（组件自带样式、类名带组件前缀），使得后续能用 React Bits 模板组件替换单个片段，而不牵连其他代码。

#### Scenario: 替换单个片段
- **WHEN** 后续需要把某个片段（如首页 hero、文章列表项）换成 React Bits 组件
- **THEN** 只需新增 / 替换该组件的文件与其样式，App 状态、终端联动、导航逻辑均不受影响

#### Scenario: 样式隔离
- **WHEN** 新增 React Bits 组件
- **THEN** 其样式使用独立类名前缀（如 `bglow-` / `dither-` / `home-`），不污染全局样式

## MODIFIED Requirements

### Requirement: 导航初始状态
原导航初始选中「日志」。现改为：默认进入首页，posts/projects/about 均未激活；点击任一标签进入对应页面并激活该标签。

### Requirement: 虚拟文件系统路径
原目录为 `~/blog`、`~/projects`、`~/about`、`~/secret`。现调整为 `~`（根，对应首页）、`~/posts`、`~/projects`、`~/about`、`~/secret`；`ls` 根目录输出相应调整；cwd 初始值为 `~`。

### Requirement: 导航命令 blog
原 `blog` 命令为独立导航命令。现改为 `posts` 的别名，行为不变（跳转文章列表页）。

## REMOVED Requirements
无。
