# Checklist

## 移动端版心与导航（Requirement 1/2）
- [x] 375px 视口下任意页面内容距屏幕左右边缘约 16px，无横向滚动条（CSS：`.content-shell` ≤768px `max-width: calc(100vw - 32px); padding: 76px 16px 24px`）
- [x] 320px 视口下导航栏 home/三个 tab/登录按钮均完整可见，登录按钮不溢出屏幕（时钟隐藏 + `.navbar-tabs` 横向滚动兜底 + `.navbar-right` 不收缩）
- [x] ≤768px 时钟整组隐藏，导航无挤压错位

## 动效闪烁（Requirement 3）
- [x] 异步 section（BlogSection/ProjectsSection/AboutSection）在数据渲染后的 `useLayoutEffect`（绘制前）调用 `hideMotionElements`，消除"先显示→消失→再动画"窗口（代码实现已核验；真机慢网最终确认见交付说明）
- [x] 各页滚动动效（标题 clip、卡片 stagger、reveal、图片 reveal）正常触发（gsap/usePageMotion 逻辑未改动，构建通过）
- [x] 静态页（home）行为不受影响；`prefers-reduced-motion` 与禁用 JS 时内容仍可见（hideMotionElements fail-open 契约保留）

## 评论回复与删除（Requirement 4/5）
- [x] 登录用户可回复任意评论，回复嵌套显示在目标评论下（树构建 + 递归渲染，冒烟验证 parent 关联正确）
- [x] 回复创建成功即时显示，无需刷新（POST 返回对象追加本地列表）
- [x] 作者/管理员可删除自己的评论（含确认），删除顶级评论级联删除其全部回复（冒烟验证 403/204/级联）
- [x] 非作者无删除入口；未登录点回复弹出登录框（openAuth）

## 通知与邮件（Requirement 6/7）
- [x] 他人回复我的评论时生成站内未读通知；回复自己的评论不生成（冒烟验证 unread_count/actor/post_slug）
- [x] 导航栏登录态显示未读徽标，读数与实际未读一致（refreshUnread 逻辑核验）
- [x] 通知列表展示"actor 回复了你在《文章》的评论"，点击后标记已读并跳转对应文章
- [x] 单条已读与"全部已读"生效，徽标计数同步更新（冒烟验证 unread_count 0）
- [x] 有邮箱用户收到回复提醒邮件（正文含回复者/回复内容/文章链接，dev console 后端已见输出）；无邮箱用户不发邮件且无报错（fail-open 验证）

## 账号与密码（Requirement 8/9/10）
- [x] 注册时邮箱必填，空/格式非法被拒绝并提示；合法则注册成功（冒烟验证 400/400/201）
- [x] 忘记密码：输入邮箱获取验证码（60s 冷却，10 分钟有效，同邮箱仅一枚）；错误验证码超限/过期时报错并提示重新获取（冒烟验证 request→confirm→新密码登录全流程 + 错误码 400）
- [x] 验证码正确 + 新密码提交后密码重置成功，可用新密码登录（冒烟验证）
- [x] 邮箱不存在时请求验证码返回相同提示（防枚举，冒烟验证 200）
- [x] 用户面板"资料"页展示用户名（只读）并可修改邮箱，保存后 `/me/` 返回新邮箱（冒烟验证 PATCH）
- [x] dev 下邮件经 console 后端可见；prod 的 EMAIL_* 已在 deploy/.env.example 说明（部署时填真实 SMTP 凭据）

## Django 后台移动端（Requirement 11）
- [x] ≤480px 视口访问 /admin/：无整页横向溢出，列表表格容器内可横滚，表单字段全宽可操作，触控目标不小于 40px（simpleui-mobile.css 已注入并被 collectstatic 收集，runserver 实测 css 200；真机视觉最终确认见交付说明）
- [x] 桌面端后台外观无明显回归（覆盖 CSS 全部位于 ≤480px 媒体查询内）

## 构建与回归
- [x] `python manage.py migrate` 成功，Django 服务启动无报错（makemigrations --check 无待生成变更）
- [x] `npm run build` 通过
- [x] 点赞、附件、登录/注册、TOC、返回顶部等既有功能无回归（相关代码未改动，构建 + 冒烟通过）
