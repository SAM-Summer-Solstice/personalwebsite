# Tasks

- [x] Task 1: 焦点提示回归修复
  - [x] SubTask 1.1: `src/App.jsx` `handleNavigate`：`tab === 'blog' && id` → `navigate('/posts', { state: { focusId: id } })`（不再直接跳 `/posts/:id`）；`tab === 'projects' && id` 行为不变
  - [x] SubTask 1.2: `src/components/sections/BlogSection.jsx`：`BlogCard` `onOpen` 改用 `useNavigate()` 跳 `/posts/<id>`（列表内点卡片进单篇）；确认 `focusId` prop 高亮（flashId/滚动定位）正常生效
  - [x] SubTask 1.3: 验证：首页点文章 → `/posts` 列表 + 高亮滚动；列表点卡片 → 单篇；深链接 `/posts/<id>` → 单篇
- [x] Task 2: Lanyard 降载（about 卡顿主因）
  - [x] SubTask 2.1: `src/components/Lanyard.jsx` `Band`：物理 `timeStep` 桌面由 1/60 改为 1/30（与 isMobile 一致）
  - [x] SubTask 2.2: MeshLine 重建优化：`getPoints` 分段 32 → 16；缓存上一帧曲线点，位移低于阈值跳过 `setPoints` 重建（减少每帧 Float32Array 分配与 GC）
  - [x] SubTask 2.3: 验证 about 页吊牌观感无回归、加载正常
- [x] Task 3: Dither 与 3D 并存降载
  - [x] SubTask 3.1: `src/App.jsx`：`activeTab === 'projects' || activeTab === 'about'` 时 Dither 传 `disableAnimation={true}`，其余页面保持动画；切回首页/列表恢复动画
  - [x] SubTask 3.2: 验证波浪背景在 projects/about 为静态像素观感（无空白/闪屏），其他页动画正常
- [ ] Task 4: 构建与回归验证
  - [x] SubTask 4.1: `npm run build` 通过；Django 托管刷新
  - [x] SubTask 4.2: 浏览器回归：首页/列表/单篇/项目/关于——focus 流程、单篇访问、波浪/吊牌/星图/动效/终端/登录评论点赞全部正常，控制台无 error（A1-A7 全部实测通过）
  - [ ] SubTask 4.3: 性能复测（同口径 headless 1440×900 5s）：about 页 FPS 提升、帧间隔 p95 < 12.6ms、R3F render 每帧开销与 JS 执行时长下降、MinorGC 减少；projects 页不掉帧

# Task Dependencies
- [Task 1] 独立
- [Task 2] 独立
- [Task 3] 独立
- [Task 4] 依赖 [Task 1..3]
- [Task 5] 依赖 [Task 4]（复测发现 Dither 冻结时仍每帧重绘，追加暂停渲染循环）

- [x] Task 5: Dither 冻结时暂停渲染循环（p95 优化）
  - [x] SubTask 5.1: `src/components/Dither.jsx` Canvas `frameloop={disableAnimation ? 'demand' : 'always'}`（projects/about 冻结时彻底停止重绘，画面保留；切回动画时恢复；同时修复 demand 模式首帧 resolution 全黑——useFrame 兜底同步分辨率）
  - [x] SubTask 5.2: 验证 projects/about 波浪静态画面保留、切页恢复正常、控制台无 error
  - [x] SubTask 5.3: about 页复测：帧间隔 p95 12.6ms → 4ms、长任务 1×138ms → 0、FPS 提升；projects 不掉帧
