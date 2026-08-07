# Checklist

- [x] posts.js 每篇含 views / comments / likes，content 为结构化块数组（含 h2 小标题）
- [x] projects.js 每个项目含 url / github / date / related，status 覆盖三态
- [x] 数据冒烟校验通过，无字段缺失或 undefined 引用
- [x] posts 工具栏：标签筛选与关键词搜索叠加生效，空结果有提示
- [x] posts 帖子感：浏览数/评论数/点赞展示正确，评论可展开、点赞可交互
- [x] posts 单篇视图：点击标题进入、返回列表保留筛选状态
- [x] posts TOC：正文顶部目录生成且锚点跳转正常
- [x] projects 外链：demo / github 链接以新标签打开，无字段不显示
- [x] projects 时间线：按 date 倒序，三色状态点 + 日期展示
- [x] projects 知识网络：related 连线 + 流动动画，无关联节点独立
- [x] 窄屏（<1024px）下 posts 与 projects 页面不破版
- [x] 暗色主题下新功能样式与站点风格协调
- [x] `npm run build` 通过
