# 高级动效系统（GSAP Motion）Spec

## Why
现有页面动效是普通 CSS 淡入（`fadeIn 0.35s` / `.home-fade`），用户希望升级为高端设计师作品集/创意机构官网级别的动效：首屏完整 opening animation、标题强视觉进场（遮罩揭开 / 位移 / 压缩归位）、滚动进入模块时英文大标题先大幅进场、卡片依次 stagger、图片 reveal + 轻微 parallax。要求节奏慢、缓动丝滑、不廉价弹跳、不影响性能，使用 GSAP + ScrollTrigger 实现。

## What Changes
- 新增依赖 `gsap`
- 新建集中式动效模块（GSAP 注册、`ScrollTrigger` 滚动容器绑定 `.content-area`、数据属性扫描、动画生命周期清理）
- 各 Section 标题 / 列表 / 图片加入动效数据属性与必要的 wrapper 结构
- `MarkdownBody` 图片输出改为 `<figure class="md-figure">` 包裹，以支持 reveal + parallax
- CSS 提供初始隐藏态（避免 FOUC）与动画过渡；移除/让位旧普通淡入
- 动效始终运行，**不因 `prefers-reduced-motion` 禁用**（用户系统已开启 reduce 但仍明确要求动效，与星图自转的处理一致）

## Impact
- Affected specs: `create-hybrid-terminal-blog`（页面结构）、`add-homepage`（首页 hero）、`side-panels`、`ux-polish-round`（滚动记忆）
- Affected code:
  - `package.json`（新增 gsap）
  - `src/motion/usePageMotion.js`（新建：动效系统核心）
  - `src/components/ContentArea.jsx`（接入动效初始化）
  - `src/components/sections/HomeSection.jsx`（opening + 标题/卡片/视差）
  - `src/components/sections/BlogSection.jsx` / `ProjectsSection.jsx` / `AboutSection.jsx`（标题/卡片/条目动效）
  - `src/components/MarkdownBody.jsx`（图片 figure wrapper）
  - `src/components/ContentArea.css` / `HomeSection.css`（初始隐藏态 + 动画相关样式）
  - 各 Section 顶部标题（`.section-title` `~/posts` 等）

## ADDED Requirements

### Requirement: GSAP 动效系统
系统 SHALL 提供基于 GSAP + ScrollTrigger 的动效系统，统一滚动容器为 `.content-area`（页面滚动区而非 window），全部动画仅操作 `transform / opacity / clip-path`（不触发 layout，性能友好），并在组件/页面卸载时完整清理已注册的动画与 ScrollTrigger。

#### Scenario: 页面切换不残留动画
- **WHEN** 用户在 home / posts / projects / about 间切换
- **THEN** 旧页面动画与 ScrollTrigger 全部销毁，新页面动画随内容挂载重新初始化；滚动位置记忆恢复后，已越过触发点的元素直接呈现最终态，不重复播放

### Requirement: 首屏 Opening Animation
系统 SHALL 在站点首次加载（home 首屏）播放完整 opening animation：全屏揭幕面板 + 主标题强进场。

#### Scenario: 首次加载
- **WHEN** 用户首次打开站点（home 页）
- **THEN** 播放约 1.4s 的 opening：主标题（`.home-name`）在遮罩容器内经位移 + 压缩（scaleY 过冲归位）进场，同时全屏面板向上揭开设幕，随后 meta / desc / chips 依次进场；缓动使用 power4 系，无廉价弹跳

#### Scenario: 再次回到首页
- **WHEN** 用户从其他页面切回 home
- **THEN** 播放轻量版进场（主标题遮罩揭示 + 内容依次出现），不重复全屏揭幕

### Requirement: 模块标题强进场
系统 SHALL 让各模块标题（如 `~/posts`、`~/projects`、`~/about`、`about-name`、`blog-single-title`、`project-name` 等）在滚动进入视口时先大幅进场：遮罩揭开 + 位移 + 轻微压缩归位。

#### Scenario: 滚动进入模块
- **WHEN** 用户滚动到某个模块标题
- **THEN** 标题以 clip 遮罩揭开 + 位移 + scaleY 归位的方式大幅进场，随后该模块的卡片/条目开始依次出现

### Requirement: 卡片 Stagger
系统 SHALL 让模块内的卡片 / 条目（`.blog-item`、`.home-item`、`.project-item`、`direction-chips`、`about-section` 等）在标题进场后依次 stagger 出现，间隔约 0.06~0.09s，节奏慢而克制。

#### Scenario: 列表进场
- **WHEN** 列表容器进入视口
- **THEN** 容器内子项从下向上 + 轻微透明度依次进场，呈明显的前后层次

### Requirement: 图片 Reveal + Parallax
系统 SHALL 让 Markdown 正文图片以 reveal + 轻微 parallax 呈现：图片随滚动进入时以 scale/opacity reveal，滚动过程中轻微视差位移。

#### Scenario: 阅读含图文章
- **WHEN** 用户滚动到帖子正文中的图片
- **THEN** 图片以轻微放大 + 淡入 reveal 进场，滚动过程中产生轻微视差位移

### Requirement: 性能约束
系统 SHALL 避免性能问题：动画仅用合成器友好属性；大量子项（如文章列表）使用单 ScrollTrigger + stagger，而非逐项创建；滚动时避免强制同步布局。

## MODIFIED Requirements

### Requirement: 现有 CSS 淡入被动效接管
原有的 `fadeIn 0.35s` 与 `.home-fade` 普通淡入让位于 GSAP 动效；CSS 保留初始隐藏态（元素默认隐藏，由 GSAP 进场时显示）作为降级手段。

**注**：实现阶段将调用 `trae-remote-official:web-app-development:uicraft` 插件获取动效缓动、节奏与视觉细节的设计指导。
