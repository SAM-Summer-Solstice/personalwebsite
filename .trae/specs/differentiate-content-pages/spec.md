# 内容页差异化（posts / projects）Spec

## Why
`~/posts` 与 `~/projects` 目前结构雷同（纯文字列表 + 点击展开/收起），功能定位不清晰，观感几乎一样。按用户选定的方向分别注入差异化能力：**posts 强化"阅读与互动"**（帖子感、单篇独立视图、标签筛选/搜索、目录 TOC），**projects 强化"作品展示"**（Demo/GitHub 外链、状态时间线、项目知识网络）。

## What Changes
- **数据层扩展（posts.js / projects.js）**：现有字段全部保留，新增字段（占位 mock，风格与现有占位内容一致）
  - `posts.js`：新增 `views`（浏览数）、`comments`（评论数组，含 `author/time/text`）、`likes`（点赞数）；`content` 由纯字符串数组改为**块数组** `[{ type: 'h2'|'p', text }]`，为 TOC 提供小标题
  - `projects.js`：新增 `url`（在线 Demo 链接）、`github`（仓库链接）、`date`（时间，用于时间线排序）、`related`（关联项目 id 数组，驱动知识网络，可缺省即"或许有、或许没有"）；`status` 支持 `规划中 / 进行中 / 已完成` 三态
- **posts 页**：
  - 工具栏：搜索框（按标题/标签匹配）+ 标签 chips 筛选（可点选、激活态高亮）
  - 帖子感：每条文章底部显示浏览数、评论数（点击展开评论列表）、点赞按钮（可交互，前端 state）
  - 单篇独立视图：点击文章标题进入单篇阅读页（BlogSection 内部状态切换，无需路由库），含返回列表、聚焦正文、TOC 目录锚点跳转、评论列表与发表评论表单（本地 mock）
  - 列表模式原有的"展开/收起"保留
- **projects 页**：
  - 外链：每条项目显示 Demo / GitHub 链接（`target="_blank"` 新标签打开）
  - 时间线：按 `date` 倒序排列；状态点三色（已完成 `--accent-2` / 进行中 `--accent` / 规划中 `--text-muted`），并显示日期
  - 知识网络：页面上方新增 SVG 网络图，节点 = 项目（名称 + emoji），连线 = `related` 关系；连线带流动动画表达"动态连接"；无 `related` 的项目独立成点
- 样式统一写入 `ContentArea.css`，延续 Quiet Craft 纯文字风格（无卡片、克制动效）
- **不引入任何新依赖**（知识网络用原生 SVG + CSS 动画）

## Impact
- Affected specs: `add-lanyard-to-about`（about 页不影响）、`create-hybrid-terminal-blog`（终端命令不变）
- Affected code:
  - `src/data/posts.js`（字段扩展 + content 结构化）
  - `src/data/projects.js`（字段扩展）
  - `src/components/sections/BlogSection.jsx`（工具栏、帖子感、单篇视图、TOC）
  - `src/components/sections/ProjectsSection.jsx`（外链、时间线、网络图挂载）
  - 新增 `src/components/sections/ProjectsNetwork.jsx`（SVG 知识网络）
  - `src/components/ContentArea.css`（posts 工具栏/帖子感/单篇视图/TOC/评论；projects 外链/时间线/网络图样式）
  - `src/components/sections/BlogSection.css` 不存在，样式统一在 ContentArea.css（保持现状）

## ADDED Requirements

### Requirement: posts 帖子感（浏览 / 评论 / 点赞）
系统 SHALL 在每条文章上展示浏览数、评论数与点赞数，并提供可交互的评论展开与点赞。

#### Scenario: 帖子信息展示
- **WHEN** 用户浏览 `~/posts` 列表
- **THEN** 每条文章显示浏览数（`views`）、评论数（`comments.length`）、点赞数（`likes`）

#### Scenario: 评论展开
- **WHEN** 用户点击评论按钮
- **THEN** 展开评论列表（含作者、时间、内容），再次点击收起

#### Scenario: 点赞交互
- **WHEN** 用户点击点赞按钮
- **THEN** 点赞数 +1 且按钮进入已赞态（前端 state，刷新恢复初始值）

### Requirement: posts 标签筛选与搜索
系统 SHALL 提供标签筛选与关键词搜索，过滤文章列表。

#### Scenario: 标签筛选
- **WHEN** 用户点击某个标签 chip
- **THEN** 列表仅显示包含该标签的文章，激活 chip 高亮；再次点击取消

#### Scenario: 搜索
- **WHEN** 用户在搜索框输入关键词
- **THEN** 列表仅显示标题或标签命中关键词的文章；与标签筛选叠加生效

#### Scenario: 空结果
- **WHEN** 筛选/搜索后无匹配文章
- **THEN** 显示空状态提示文案（纯文字，克制）

### Requirement: posts 单篇独立视图
系统 SHALL 在点击文章标题后进入单篇阅读视图。

#### Scenario: 进入单篇
- **WHEN** 用户点击列表中的文章标题
- **THEN** 列表切换为单篇视图，展示标题、日期、标签与完整正文（含小标题段落）

#### Scenario: 返回列表
- **WHEN** 用户点击"← 返回列表"
- **THEN** 回到列表视图（筛选/搜索状态保留）

### Requirement: posts 目录 TOC 锚点跳转
系统 SHALL 在单篇视图正文顶部生成目录，点击可跳转到对应小节。

#### Scenario: 目录生成
- **WHEN** 单篇正文包含 `h2` 小标题块
- **THEN** 正文顶部显示目录（小标题列表），无小标题时不显示目录

#### Scenario: 锚点跳转
- **WHEN** 用户点击目录中的某一项
- **THEN** 页面平滑滚动到对应小节（滚动容器为 `.content-area`）

### Requirement: projects 外链（Demo / GitHub）
系统 SHALL 在每条项目上展示 Demo 与 GitHub 链接。

#### Scenario: 外链展示
- **WHEN** 用户浏览 `~/projects` 列表
- **THEN** 每条项目显示 `demo` 与 `github` 链接文字，点击以新标签打开；无链接字段则不显示对应项

### Requirement: projects 状态时间线
系统 SHALL 按时间倒序排列项目，并以三色状态点 + 日期展示状态。

#### Scenario: 时间排序
- **WHEN** 用户浏览 `~/projects`
- **THEN** 项目按 `date` 从新到旧排列

#### Scenario: 状态展示
- **WHEN** 项目 `status` 为 规划中 / 进行中 / 已完成
- **THEN** 分别以 `--text-muted` / `--accent` / `--accent-2` 状态点 + 状态文字 + 日期展示

### Requirement: projects 知识网络
系统 SHALL 在 `~/projects` 页面上方展示项目间的连接网络图。

#### Scenario: 节点与连线
- **WHEN** 项目 `related` 引用其他项目 id
- **THEN** 网络图以节点（项目名 + emoji）与连线展示关系；连线带流动动画表达动态性

#### Scenario: 无关联项目
- **WHEN** 项目没有 `related`
- **THEN** 该节点独立显示，不产生连线

## MODIFIED Requirements

### Requirement: posts 列表基础结构
原"日期 + 标题 + 标签 + 摘要 + 展开全文"结构 SHALL 保留（展开/收起行为不变），新增工具栏与帖子信息行，视觉仍为纯文字列表。

### Requirement: projects 列表基础结构
原"名称 + 状态 + tagline + 技术栈 + 展开详情"结构 SHALL 保留，新增外链行、日期与状态点三色细分。

## REMOVED Requirements

### Requirement: posts 单一平铺列表
**Reason**: 缺少定位与检索手段，浏览体验单一。
**Migration**: 保留列表为主视图，新增工具栏与单篇视图，作为进入阅读的补充路径。

### Requirement: projects 仅展示文本信息
**Reason**: 作品页缺少可访问的成果链接与时间脉络。
**Migration**: 新增外链与时间线；知识网络作为页面顶部装饰性概览。
