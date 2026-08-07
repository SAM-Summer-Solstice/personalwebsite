# Checklist

- [x] 打开站点默认显示首页，而非日志列表
- [x] 首页包含：大字号姓名、一句话定位、学习方向标签、最近文章预览、精选项目预览、联系方式
- [x] 首页为纯文字排版，无卡片容器、无头像、无 AI 感贴图
- [x] 点击顶栏 `~/blog` 可返回首页
- [x] 首页状态下 posts/projects/about 三个标签均不高亮
- [x] 导航标签与终端导航命令命名一致：`posts / projects / about`
- [x] 终端输入 `blog` 与 `posts` 行为一致（别名）
- [x] 终端输入 `home` 输出提示并切换到首页
- [x] 终端输入 `cd` 或 `cd ~` 或子目录 `cd ..` 切换到首页
- [x] `cd posts / projects / about` 进入对应目录（提示符路径同步）并联动切换页面
- [x] `ls` 输出与页面结构一致：根目录列出 `posts/ projects/ about/ readme.md contact.txt`
- [x] 各页面小节标题与虚拟路径一致：`~/posts`、`~/projects`、`~/about`，首页为 `~`
- [x] `help` 中列出 `home` 与 `posts`（标注 `blog` 为别名）
- [x] 首页元素错落淡入；系统开启"减弱动态效果"时无动画
- [x] 首页为独立组件 + 独立样式（类名前缀 `home-`），可整段替换为 React Bits 组件而不牵连其他代码
- [x] `npm run build` 构建成功
