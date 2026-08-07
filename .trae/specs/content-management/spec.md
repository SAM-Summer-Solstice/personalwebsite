# 内容真实化：Markdown 管线 + 真实浏览量 + Giscus 评论 Spec

## Why
目前 posts / projects 是开发期生成的 mock 数据（`src/data/*.js`），用户没有"提交真实内容"的入口；浏览量为假数字，评论只存在浏览器本地。用户希望：① 用 **Markdown 文件 + git** 作为后续提交内容的入口；② 浏览量统计**真实访问数据**（计划后续用树莓派/服务器自建后端）；③ 评论用 **Giscus**（GitHub Discussions）。同时要求应用前端工具箱（uicraft）技能、具备高级审美。

## What Changes
- **Markdown 内容管线（新内容入口）**：
  - 新建 `content/posts/*.md`、`content/projects/*.md`，把现有 mock 内容迁移为 Markdown（YAML frontmatter 存结构化字段，正文为 Markdown）
  - 新增依赖 `marked`（Markdown 渲染）；frontmatter 用手写轻量解析（固定格式）
  - `src/data/posts.js` / `projects.js` 改造为"读取并解析 content/ 的加载层"（`import.meta.glob` 读取 raw，解析 frontmatter + 渲染函数），导出结构保持与现有消费方（HomeSection 等）兼容
  - 新增正文渲染组件与 `.md-body` 排版（标题层级、段落、行内码、代码块、列表、引用、链接）
  - TOC 改为从渲染后 DOM 提取 h2（带锚点 id），单篇视图交互不变
- **真实浏览量（自建后端，可部署树莓派/服务器）**：
  - 新增 `server/`：零依赖 Node（内置 `http`）服务，`GET/POST /api/views/:postId`，JSON 文件持久化（原子写）
  - 前端 `src/api.js` 封装请求：单篇视图每次访问 +1（sessionStorage 每会话一次），列表页展示真实浏览量；请求失败优雅降级（显示 frontmatter 中的 mock 数）
  - `vite.config.js` 增加 dev 代理 `/api` → 本地 server，便于联调
  - 新增启动脚本 `npm run server`
- **Giscus 评论**：
  - 新增依赖 `@giscus/react`
  - 单篇视图底部嵌入 Giscus（mapping=pathname）；仓库尚未发布到 GitHub，配置常量留占位，**配置缺失时显示提示文案**而非渲染损坏的 iframe；文档说明如何获取 repo/repoId/category/categoryId
  - 移除列表页"展开 mock 评论"交互，评论统一收敛到单篇视图；列表评论入口跳转单篇
- **审美（uicraft 技能）**：正文排版、TOC、浏览量行、Giscus 嵌入样式、降级态、空状态全部沿用站点 Quiet Craft 风格（暗色、纯文字、发丝线 `--border`、accent 点缀、克制动效、`prefers-reduced-motion` 降级）
- 既有功能保留：posts 筛选/搜索/单篇/TOC/点赞；projects 外链/时间线/知识网络；home 最近文章/精选项目预览

## Impact
- Affected specs: `differentiate-content-pages`（其功能保留，数据源改为 Markdown）、`create-hybrid-terminal-blog`（终端 `cat` 等命令读取内容的方式可能受影响，需核对）
- Affected code:
  - 新增 `content/posts/*.md`、`content/projects/*.md`
  - `src/data/posts.js`、`src/data/projects.js`（改为加载/解析层）
  - `src/components/sections/BlogSection.jsx`（正文渲染、TOC、评论入口、浏览量）
  - `src/components/sections/HomeSection.jsx`（若数据形状变化则适配，否则不动）
  - 新增 `src/components/MarkdownBody.jsx`、`src/api.js`
  - 新增 `server/index.js`、`server/data/`（运行时生成）、`server/README.md`
  - `package.json`（新增 marked、@giscus/react、server 脚本）
  - `vite.config.js`（dev 代理）
  - `src/components/ContentArea.css`（`.md-body` 排版、Giscus 容器、浏览量、降级态样式）

## ADDED Requirements

### Requirement: Markdown 内容入口
系统 SHALL 支持通过编写 `content/` 目录下的 Markdown 文件来新增/修改文章与项目。

#### Scenario: 新增文章
- **WHEN** 用户在 `content/posts/` 新建 `xxx.md`（含 frontmatter：id/title/date/tags/excerpt + 正文）
- **THEN** 站点构建后该文章出现在 `~/posts` 列表与首页最近文章，字段（日期/标签/摘要/浏览量 mock）解析正确

#### Scenario: 新增项目
- **WHEN** 用户在 `content/projects/` 新建 `xxx.md`（含 frontmatter：id/name/emoji/tagline/tech/status/date/url/github/related + 正文）
- **THEN** 项目出现在 `~/projects` 与首页精选项目，外链/时间线/知识网络引用正确

#### Scenario: frontmatter 缺字段
- **WHEN** Markdown frontmatter 缺少必需字段
- **THEN** 构建时报明确错误（加载层校验），不静默产出坏数据

### Requirement: Markdown 正文渲染
系统 SHALL 将 Markdown 正文渲染为结构化 HTML 并在单篇视图展示。

#### Scenario: 正文展示
- **WHEN** 用户打开单篇视图
- **THEN** 正文按 Markdown 语义渲染（标题/段落/行内码/代码块/列表/引用/链接），样式符合暗色 Quiet Craft 排版

#### Scenario: TOC 生成
- **WHEN** 正文包含 `##` 二级标题
- **THEN** 单篇视图 TOC 列出这些标题，点击平滑滚动到对应小节（`prefers-reduced-motion` 下瞬时）；无标题则不显示 TOC

### Requirement: 真实浏览量统计
系统 SHALL 通过自建 API 统计并展示真实浏览量。

#### Scenario: 计数
- **WHEN** 用户打开某篇文章单篇视图
- **THEN** 前端向 `/api/views/:postId` 发送一次 +1 请求（同一浏览器会话只计一次），并展示最新浏览量

#### Scenario: 列表展示
- **WHEN** 用户在 `~/posts` 列表
- **THEN** 每条文章展示来自 API 的真实浏览量（异步加载）

#### Scenario: 后端不可用
- **WHEN** API 请求失败或服务未部署
- **THEN** 页面优雅降级：浏览量展示 frontmatter 中的 mock 数字，不影响其他功能

### Requirement: Giscus 评论
系统 SHALL 在单篇视图集成 Giscus 评论。

#### Scenario: 已配置
- **WHEN** Giscus 配置常量（repo/repoId/category/categoryId）已填真实值且站点运行于该仓库域名
- **THEN** 单篇视图底部渲染 Giscus 评论 iframe，可登录 GitHub 发表评论

#### Scenario: 未配置
- **WHEN** 配置常量为占位/空值
- **THEN** 评论区域显示提示文案（如"评论功能需要将站点发布到公开 GitHub 仓库并配置 Giscus 后启用"），不渲染损坏 iframe

### Requirement: 本地后端服务
系统 SHALL 提供可部署到树莓派/服务器的零依赖 Node 后端。

#### Scenario: 启动与持久化
- **WHEN** 运行 `npm run server`
- **THEN** 服务监听端口，读写 `server/data/views.json`，重启后数据不丢失

#### Scenario: 联调代理
- **WHEN** 开发环境运行 `npm run dev`
- **THEN** `/api/*` 请求被 Vite 代理到本地 server，前后端可联调

## MODIFIED Requirements

### Requirement: 既有内容页功能
`differentiate-content-pages` 的筛选/搜索/单篇/TOC/点赞、projects 外链/时间线/知识网络、home 预览 SHALL 全部保留，仅数据源改为 Markdown 解析结果。

### Requirement: 评论交互
列表页"评论 N 展开本地 mock 评论"SHALL 移除，改为评论入口（跳转/定位到单篇视图的 Giscus 区域）。

## REMOVED Requirements

### Requirement: src/data 手写 mock 内容
**Reason**: 内容将托管于 `content/*.md`，以 git 提交作为内容入口。
**Migration**: 现有 mock 内容迁移到 `content/` 下的 Markdown 文件；`src/data/posts.js`、`projects.js` 改为解析加载层（导出结构不变）。
