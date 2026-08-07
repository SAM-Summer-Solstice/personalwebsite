# Tasks

- [x] Task 1: GSAP 动效系统骨架
  - [x] SubTask 1.1: 安装 `gsap` 依赖
  - [x] SubTask 1.2: 新建 `src/motion/usePageMotion.js`：注册 GSAP + ScrollTrigger，滚动容器固定为 `.content-area`；提供 `initPageMotion(scopeEl)` 扫描容器内 `[data-reveal-title]` / `[data-stagger]` / `[data-reveal]` / `[data-parallax]` 并创建动画；返回 cleanup（kill 全部 ScrollTrigger / 恢复初始态）
  - [x] SubTask 1.3: `ContentArea.jsx` 在 `content-shell` 挂载后调用 `initPageMotion`，卸载/切换时执行 cleanup；标题与卡片元素预置初始隐藏态（GSAP 接管）
- [x] Task 2: 首屏 Opening Animation（HomeSection）
  - [x] SubTask 2.1: `.home-name` 外层包遮罩容器（overflow hidden），hero 加揭幕面板元素（fixed 全屏、与背景同色）
  - [x] SubTask 2.2: 时间线：标题位移 + scaleY 压缩归位 + 面板向上揭开 + meta/desc/chips 依次进场（power4，无弹跳，约 1.4s）
  - [x] SubTask 2.3: 模块级标志：仅首次加载播放完整 opening，切回 home 播放轻量版
- [x] Task 3: 模块标题强进场 + 卡片 Stagger
  - [x] SubTask 3.1: 各 Section 标题加 `data-reveal-title`（`~/posts` / `~/projects` / `~/about` / `about-name` / `blog-single-title` 等），并为标题包遮罩容器
  - [x] SubTask 3.2: 列表容器加 `data-stagger`（`.blog-list` / `.home-list` / `.projects-list` / `direction-chips` / `about-section` 容器），子项依次进场
  - [x] SubTask 3.3: ContentArea.css / HomeSection.css 增加初始隐藏态与过渡相关样式，移除旧 `.home-fade` 依赖
- [x] Task 4: 图片 Reveal + Parallax（MarkdownBody）
  - [x] SubTask 4.1: `renderer.image` 输出 `<figure class="md-figure">` 包裹 `<img>`
  - [x] SubTask 4.2: `usePageMotion` 支持 `.md-figure`：reveal（scale 1.12→1 + opacity）与 img 轻微 parallax（translateY），复用数据属性或按类名识别
  - [x] SubTask 4.3: CSS：`.md-figure` overflow hidden、img 占满，保证无布局抖动
- [ ] Task 5: 构建与验证
  - [x] SubTask 5.1: `npm run build` 通过
  - [ ] SubTask 5.2: 运行时验证：opening 播放、滚动模块标题强进场、卡片 stagger、图片 reveal/parallax、页面切换无动画残留、无 FOUC、滚动位置记忆不受影响

# Task Dependencies
- [Task 5] 依赖 [Task 1]、[Task 2]、[Task 3]、[Task 4]
