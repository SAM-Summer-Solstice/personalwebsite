# Checklist

- [ ] 站点首次加载播放完整 opening animation（标题遮罩揭开 + 位移 + 压缩归位 + 面板揭幕，power4 无弹跳）；切回 home 仅轻量版
- [ ] 滚动进入模块时，英文标题先大幅进场（遮罩揭开 + 位移 + 压缩归位）
- [ ] 卡片/条目在标题进场后依次 stagger 出现
- [ ] Markdown 正文图片 reveal + 轻微 parallax
- [ ] 动画仅操作 transform/opacity/clip-path，滚动流畅无卡顿
- [ ] 页面切换时旧动画完整销毁、无残留；滚动位置记忆不受影响
- [ ] 动效不因 prefers-reduced-motion 被禁用（用户明确要求）
- [ ] 无 FOUC（初始隐藏态生效，无闪烁）
- [ ] `npm run build` 通过
