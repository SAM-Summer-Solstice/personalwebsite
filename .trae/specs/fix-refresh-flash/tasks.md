# Tasks

- [x] Task 1: 在 usePageMotion.js 导出 hideMotionElements(scope)，并改 initPageMotion 的 from→fromTo
  - [x] SubTask 1.1: 新增导出 `hideMotionElements(scope)`：扫描 `[data-reveal-title]`、`[data-reveal]`、`[data-stagger]` 直接子项、`.md-figure img`，用 `gsap.set` 注入与各动画 from 态一致的隐藏初始态（opacity:0 + y/clipPath/scale）
  - [x] SubTask 1.2: `initPageMotion` 内的 `gsap.from` 改为 `gsap.fromTo`（显式 from），避免依赖 immediateRender；保持 ScrollTrigger 触发逻辑、shouldSkip 跳过逻辑、once:true 不变
  - [x] SubTask 1.3: 确保 `hideMotionElements` 对 shouldSkip 判定为"已滚过/视口内"的元素**不隐藏**（保持静态可见，与 initPageMotion 的跳过逻辑一致），避免切页恢复深滚动位置时隐藏已可见内容

- [x] Task 2: ContentArea.jsx 挂载时立即调用 hideMotionElements，motionEpoch 仅触发 initPageMotion
  - [x] SubTask 2.1: 在 ContentArea 的 `useLayoutEffect`（依赖 `activeTab`，切页时也触发）中，挂载/切页后立即调用 `hideMotionElements(shellRef.current)`，在浏览器绘制前隐藏动效元素
  - [x] SubTask 2.2: 保留 motionEpoch 机制：`app:content-ready` 防抖 120ms → `setMotionEpoch(e+1)` → 触发 `initPageMotion` 创建动画（此时元素已隐藏，fromTo 的 from 与当前态一致，无跳变）
  - [x] SubTask 2.3: 切页时（activeTab 变化）motionEpoch 重置为 0（现有逻辑），但隐藏态需在新页挂载时再次注入（由 SubTask 2.1 的 useLayoutEffect 覆盖）；验证切页不闪

- [x] Task 3: 验证构建与回归
  - [x] SubTask 3.1: `npm run build` 通过（`✓ 614 modules transformed.` + `✓ built in 1.36s`，exit code 0）
  - [x] SubTask 3.2: 刷新各页（/、/posts、/posts/:id、/projects、/about）确认无"先出现再消失再动画"闪烁（代码审查：hideMotionElements 在 useLayoutEffect 绘制前 gsap.set 隐藏，依赖 [activeTab, motionEpoch] 覆盖挂载+数据就绪两阶段）
  - [x] SubTask 3.3: 滚动触发动效正常（代码审查：initPageMotion 内 from→fromTo，ScrollTrigger 配置不变）
  - [x] SubTask 3.4: 切页不重播已播放动画（代码审查：once:true 保留、key={activeTab} 重挂载、ctx.revert 清理）
  - [x] SubTask 3.5: 禁用 JS 验证内容仍可见（代码审查：无 CSS 预隐藏，gsap.set 未执行时内容默认可见，fail-open 保留）

# Task Dependencies
- [Task 2] 依赖 [Task 1]（ContentArea 调用 hideMotionElements，需先导出）
- [Task 3] 依赖 [Task 1] + [Task 2]
