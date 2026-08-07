# 一键返回页面顶端：阅读进度环按钮（Back to Top）Spec

## Why
四个页面（home/posts/projects/about）长文滚动后没有快速回到顶部的入口。用户要求"眼前一亮的 UI"：不只是普通箭头按钮，而是结合站点 Quiet Craft 暗色终端气质，做一个既有高级感又有实用信息量的返回顶部控件——外圈**阅读进度环**（当前滚动进度）+ 终端彩蛋（悬停显示 `cd ~`，点击滚回顶部）。

## What Changes
- 新增全局组件 `BackToTop`（挂载于 `ContentArea`，四个页面通用）
- **阅读进度环**：右下角固定圆钮，SVG 圆环按滚动进度绘制（`scrollTop / (scrollHeight - clientHeight)`），环用 accent 色、细线（1.5–2px），中心是 mono 向上的 `↑`
- **终端彩蛋**：悬停时按钮上浮 2px、环与箭头变 accent，左侧浮出 tooltip `cd ~`（终端"回家"隐喻）；点击后短暂显示 `cd ~` 作为反馈
- **显隐**：滚动距离 > 480px 时淡入（opacity + 轻微上移），回到顶部阈值内淡出；滚动监听挂在 `.content-area`（passive）
- **点击行为**：平滑滚动回顶部；`prefers-reduced-motion` 时瞬间回到顶部
- **响应式**：窄屏（≤768px）按钮缩小（约 40px）、tooltip 隐藏（触屏无 hover）
- **无障碍**：`<button aria-label="返回页面顶部">`，键盘可聚焦
- 不与各页面独立滚动位置记忆冲突（回到顶部后进度自然归零）

## Impact
- Affected specs: `create-hybrid-terminal-blog`（全局布局）、`side-panels`（滚动交互共存）
- Affected code:
  - `src/components/BackToTop.jsx`（新增组件）
  - `src/components/ContentArea.jsx`（挂载 BackToTop）
  - `src/components/ContentArea.css`（按钮/进度环/tooltip/显隐动画/响应式样式）

## ADDED Requirements

### Requirement: 阅读进度环按钮
系统 SHALL 在页面右下角提供显示当前阅读进度的返回顶部按钮。

#### Scenario: 滚动显示
- **WHEN** 用户向下滚动超过 480px
- **THEN** 右下角圆钮淡入，外圈进度环随滚动位置增长（accent 色细线），中心显示 ↑

#### Scenario: 点击返回顶部
- **WHEN** 用户点击按钮
- **THEN** 页面平滑滚动回顶部（reduced-motion 时瞬间），按钮短暂显示 `cd ~` 反馈

#### Scenario: 回顶后隐藏
- **WHEN** 滚动位置回到 480px 以内
- **THEN** 按钮淡出，进度环归零

### Requirement: 终端彩蛋 tooltip
系统 SHALL 在悬停按钮时显示终端风格的 `cd ~` 提示。

#### Scenario: 悬停
- **WHEN** 用户鼠标悬停按钮（或键盘聚焦）
- **THEN** 按钮上浮 2px、环与箭头变 accent，左侧浮现 `cd ~` 小字提示

### Requirement: 响应式与无障碍
系统 SHALL 在窄屏缩小平移并隐藏 tooltip，按钮为可聚焦的语义化 button。

## MODIFIED Requirements

无（既有页面滚动行为、各页独立进度记忆不受影响）。

## REMOVED Requirements

无。
