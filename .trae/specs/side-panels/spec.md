# 桌面端双栏布局：星点 TOC 与项目概览侧栏（Side Panels）Spec

## Why
`content-shell` 版心最大 1700px 但所有页面为单列纵向流，posts 单篇页与 projects 主页在桌面宽屏下右侧留有大片空白。目标：用克制的辅助侧栏填充空白并提升可用性——帖子单篇页用"极简星点 TOC"（竖线 + 星星，hover 才显文字，滚动高亮当前小节）；projects 主页用终端风格的"项目概览侧栏"（状态统计/技术栈/最近在做）。评论区保持底部全宽（Giscus iframe 高动态，不适合窄栏）。

## What Changes
- **帖子单篇页双栏**：`.blog-single` 改为 grid 双栏（正文左 + TOC 右），TOC 侧栏 `position: sticky`；移除原顶部 `.blog-toc`，新建星点式 TOC（竖发丝线 + 每节一个星星 ✦，默认仅星星可见，hover / focus-visible 显示文字，IntersectionObserver 滚动高亮当前小节星星）
- **projects 主页双栏**：`.projects-page` 改 grid 双栏（星图 + 列表左 + 概览右），概览侧栏 sticky；概览内容为终端小字风格：`~/projects` 头 + 状态统计（done/doing/planning 计数，复用三色）+ 技术栈聚合 + 最近在做什么（最新项目 tagline）
- **响应式**：≤1024px 隐藏两个侧栏，回退单列；侧栏不占宽屏主内容宽度
- **评论区**：保持底部全宽，不移动（说明见 Why）
- **克制**：侧栏无卡片无背景，纯 mono 小字 + 发丝线分隔，暗色变量，hover 动效 ≤0.15s

## Impact
- Affected specs: `differentiate-content-pages`（帖子单篇/TOC 产物）、`content-attachments`（正文宽度不受影响）
- Affected code:
  - `src/components/sections/BlogSection.jsx`（TOC 结构改造 + scrollspy）
  - `src/components/sections/ProjectsSection.jsx`（包一层双栏容器 + 概览侧栏）
  - `src/components/ContentArea.css`（双栏 grid、星点 TOC、概览侧栏、响应式断点）

## ADDED Requirements

### Requirement: 星点 TOC 侧栏
系统 SHALL 在帖子单篇页右侧提供极简星点式目录：竖发丝线 + 每节一个星星标记，默认仅星星可见，悬停/聚焦显示小节文字。

#### Scenario: 默认状态
- **WHEN** 用户打开帖子单篇页
- **THEN** 右侧 sticky 栏显示一条竖线与若干星星，文字不可见（仅星星），不干扰正文

#### Scenario: 悬停查看
- **WHEN** 用户鼠标悬停某颗星星（或键盘聚焦）
- **THEN** 该小节文字淡入显示，星星与文字变 accent

#### Scenario: 滚动高亮
- **WHEN** 用户滚动正文
- **THEN** 当前可见小节的星星高亮为 accent，点击星星滚动到对应小节

### Requirement: 项目概览侧栏
系统 SHALL 在 projects 主页右侧提供终端风格的概览侧栏。

#### Scenario: 概览内容
- **WHEN** 用户打开 projects 主页（桌面宽屏）
- **THEN** 右侧 sticky 栏显示：`~/projects` 头部、状态统计（已完成/进行中/规划中数量）、技术栈聚合、最近在做什么（最新项目名 + tagline）

### Requirement: 窄屏回退
系统 SHALL 在 ≤1024px 隐藏两个侧栏，页面回退为既有单列布局。

## MODIFIED Requirements

### Requirement: 帖子 TOC
顶部 TOC 移除，改为右侧星点式侧栏 TOC（默认隐文字、hover 显示、滚动高亮）。

### Requirement: projects 页面结构
projects 页面由单列改为"内容 + 概览侧栏"双栏；星图、标签开关、项目列表行为不变。

## REMOVED Requirements

### Requirement: 顶部块状 TOC
**Reason**: 宽屏下右侧留白，顶部 TOC 占据正文头部空间，改为右侧星点 TOC 更优雅。
**Migration**: 功能迁移至右侧星点 TOC，滚动高亮 + 点击跳转行为保留。
