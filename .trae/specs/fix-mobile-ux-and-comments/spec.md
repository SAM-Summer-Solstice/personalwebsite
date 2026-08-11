# 移动端体验与评论系统升级 Spec

## Why

个人网站当前存在 6 个问题：
1. 手机端网页内容区两侧留白过大（约 68px/侧），阅读体验差。
2. 异步内容（文章列表/单篇/项目/关于）渲染后，文字先可见、约 120ms 后被隐藏、再随滚动动效出现，造成明显闪烁（fix-refresh-flash 只覆盖了静态内容，未覆盖异步数据渲染窗口）。
3. 手机端导航栏拥挤，时钟与标签挤压，登录按钮被挤出屏幕外。
4. 评论区没有回复、删除功能。
5. 评论回复功能落地后，需要用户登录后的个人信息面板：消息通知（回复提醒）与个人资料修改。
6. Django 后台（django-simpleui）在手机端显示混乱。

用户确认的设计决策：
- 通知渠道 = **站内通知面板 + 邮件提醒**（无邮箱用户仍有站内兜底）。
- 注册邮箱 = **必填**（含格式校验）。
- 个人简介（bio）：无展示场景，**不做**。
- 登录机制完善：**忘记密码 → 邮箱验证码重置**，并引入成熟体系常见约束（验证码有效期、防枚举、防暴力）。

## What Changes

- **移动端版心**：`.content-shell` 与 `.navbar-inner` 在 ≤768px 下收紧左右留白至 16px/12px 量级，与内容排版对齐。
- **导航栏**：≤768px 隐藏时钟整组；标签区允许横向滚动兜底；确保登录按钮始终在屏幕内。
- **动效 FOUC**：异步数据的 section（BlogSection 列表/单篇、ProjectsSection、AboutSection）在数据渲染后的 `useLayoutEffect`（绘制前）立即调用 `hideMotionElements`，消除"先显示→消失→再动画"窗口。
- **评论回复与删除**：后端 `Comment.parent` 自引用 + POST 支持 `parent_id` + DELETE（作者/管理员，级联删除回复）；前端树形渲染、回复框、删除按钮（含确认）。
- **通知系统（站内 + 邮件）**：回复他人评论时生成 Notification（站内），并在对方有邮箱时同步发送提醒邮件（fail-open）；导航栏未读徽标；面板"消息"列表 + 已读管理。
- **账号与密码**：注册邮箱必填 + 格式校验；`/me/` 支持修改邮箱；忘记密码通过邮箱验证码重置（有效期、单码、限次）；配置 Django EMAIL（dev 用 console 后端，prod 从环境变量读 SMTP 凭据）。
- **个人资料面板**：用户面板弹窗含"消息/资料"两个标签页；资料页仅展示用户名（只读）+ 修改邮箱；不含 bio。
- **后台移动端**：为 SimpleUI 增加移动端响应式 CSS 覆盖，窄屏下侧栏可收、表格可横滚、表单全宽、触控目标 ≥40px。

## Impact

- 受影响 Spec：fix-refresh-flash（动效隐藏时机机制将被增强）、content-management（评论区）、ux-polish-round（导航/返回顶部分区）。
- 受影响代码：
  - 前端：`src/components/ContentArea.css`、`src/components/Navbar.jsx/.css`、`src/components/sections/BlogSection.jsx`、`ProjectsSection.jsx`、`AboutSection.jsx`、`src/components/CommentSection.jsx`、`src/components/AuthModal.jsx/.css`、`src/api.js`、`src/auth/AuthContext.jsx`、`src/App.jsx`（新增 UserPanel）。
  - 后端：`server/django/content/models.py`、`serializers.py`、`views.py`、`urls.py`、`admin.py`、新增 migration、`blog_backend/settings/dev.py`（EMAIL console）、`prod.py`（EMAIL 读环境变量）、`deploy/.env.example`。
- 数据：新增 `Comment.parent`（可空，不破坏现有数据）、`Notification`、`PasswordResetCode`；`User.email` 复用为账号邮箱。**不新增 Profile 模型**。

## ADDED Requirements

### Requirement: 移动端版心留白修复
系统 SHALL 在 ≤768px 视口下将内容区左右留白压缩至 16px 量级，导航栏与版心对齐，不再产生横向溢出。

#### Scenario: 手机端内容区留白
- **WHEN** 用户在 375px 宽视口访问任意页面
- **THEN** 内容文字距屏幕左右边缘约 16px，无横向滚动条，阅读区宽度明显增大

### Requirement: 移动端导航栏可完整展示
系统 SHALL 在手机端隐藏时钟，压缩间距，并保证"登录"按钮始终位于屏幕内；标签区在极端窄屏下可横向滚动兜底。

#### Scenario: 手机端登录按钮不溢出
- **WHEN** 用户在 320px 宽视口访问网站
- **THEN** 导航栏内 home 与三个 tab 及登录按钮均完整可见（标签区必要时内部横向滚动），登录按钮不被挤出屏幕

### Requirement: 异步内容动效闪烁消除
系统 SHALL 在异步数据渲染提交后的同一布局阶段（绘制前）隐藏动效元素初始态，消除"内容先可见再消失再随动画出现"的窗口。

#### Scenario: 慢网络下文章列表无闪烁
- **WHEN** 用户在慢速网络下刷新 /posts 或 /posts/:id
- **THEN** 卡片/正文在首帧前即为隐藏初始态，只随滚动动效出现，全程无"先显示→消失"闪烁

### Requirement: 评论回复
系统 SHALL 允许登录用户对任意已审核评论发表回复，回复归属同一帖子；回复展示在其目标评论下。

#### Scenario: 回复评论
- **WHEN** 登录用户点击某条评论的"回复"，输入内容并提交
- **THEN** 回复创建成功并嵌套显示在目标评论之下，作者为当前用户

### Requirement: 评论删除
系统 SHALL 允许评论作者或管理员（staff）删除评论；删除含该评论及其全部回复（级联）。

#### Scenario: 删除自己的评论
- **WHEN** 评论作者点击自己的评论"删除"并确认
- **THEN** 该评论及其回复从列表与数据库中移除；非作者无删除入口

### Requirement: 回复通知（站内 + 邮件）
系统 SHALL 在他人回复我的评论时，生成一条站内未读通知，并在我的邮箱非空时同步发送提醒邮件（含回复内容与文章链接）；回复自己的评论不通知。邮件发送失败不影响评论创建（fail-open）。

#### Scenario: 收到回复通知
- **WHEN** 用户 B 回复了用户 A 的评论，且 A 已填邮箱
- **THEN** A 导航栏出现未读徽标，站内"消息"列表可见"B 回复了你在《文章标题》的评论"；A 的邮箱收到含回复内容与文章链接的邮件；点击站内通知跳转到对应文章

#### Scenario: 无邮箱用户
- **WHEN** 用户 A 未填邮箱，B 回复了 A 的评论
- **THEN** A 仅收到站内未读通知，不发送邮件，无任何报错

### Requirement: 未读通知已读管理
系统 SHALL 提供通知列表（含 unread_count）、单条已读与全部已读操作。

#### Scenario: 标记通知已读
- **WHEN** 用户打开通知列表并点击某条通知，或点击"全部已读"
- **THEN** 对应通知 is_read 置真，导航栏未读徽标计数同步减少/清零

### Requirement: 注册邮箱必填与校验
系统 SHALL 在注册时要求填写邮箱，并进行格式校验；邮箱用于登录体系（密码重置）与回复提醒。

#### Scenario: 注册邮箱校验
- **WHEN** 用户注册时邮箱为空或格式非法
- **THEN** 注册被拒绝并提示邮箱必填/格式错误；邮箱合法时注册成功

### Requirement: 忘记密码邮箱验证码重置
系统 SHALL 支持通过邮箱验证码重置密码：请求发送 6 位验证码（10 分钟有效，同用户同时仅一枚，重复请求有冷却间隔；无论邮箱是否存在均返回相同提示防枚举），输入验证码与新密码后校验并重置，验证码尝试次数超限即失效。

#### Scenario: 重置密码成功
- **WHEN** 用户忘记密码，在登录框进入"忘记密码"，输入已注册邮箱获取验证码，再输入验证码与新密码提交
- **THEN** 密码重置成功并提示可重新登录；验证码失效

#### Scenario: 验证码错误或过期
- **WHEN** 用户提交错误验证码超过限次，或验证码已过期
- **THEN** 重置失败并提示重新获取验证码

### Requirement: 个人资料修改（仅邮箱）
系统 SHALL 在用户面板"资料"页展示用户名（只读）并可修改邮箱；邮箱变更即时生效，用于后续邮件提醒与密码重置。

#### Scenario: 修改邮箱
- **WHEN** 登录用户在"资料"页修改邮箱并保存
- **THEN** 修改持久化，`/me/` 返回新邮箱，界面提示保存成功

### Requirement: Django 后台移动端适配
系统 SHALL 使 django-simpleui 后台在 ≤480px 视口下可正常使用：无整页横向溢出，列表表格可横向滚动，表单字段全宽，触控目标不小于 40px。

#### Scenario: 手机访问后台
- **WHEN** 用户在手机浏览器打开 /admin/ 并浏览/编辑列表
- **THEN** 页面无横向整页溢出，表格在容器内滚动，表单可正常操作

## MODIFIED Requirements

### Requirement: 动效隐藏时机（继承 fix-refresh-flash）
原有 `hideMotionElements` 仅由 ContentArea 在 `[activeTab, motionEpoch]` 变化时调用，异步数据渲染后存在 120ms 可见窗口。现修改为：异步 section 在数据就绪的 `useLayoutEffect` 中于绘制前直接调用 `hideMotionElements`（ContentArea 的现有调用保留，幂等无冲突）。

### Requirement: 评论序列化（继承 content-management）
`CommentSerializer` 增加 `parent`（上级评论 id，可为 null）、`author_id`、`is_mine`（当前登录用户是否为作者）；`comments` 视图 GET 时传入 request 上下文。POST 接受可选 `parent_id`。

### Requirement: 用户信息接口（继承原 /me/）
`GET /me/` 扩展返回 email；`PATCH /me/` 支持修改 email（格式校验）。原 register 的 email 由可选改为必填。

## REMOVED Requirements

### Requirement: 个人简介（bio）
**Reason**：用户资料（评论者）没有展示场景（关于页为站长单例数据），无展示价值。
**Migration**：不新增 Profile 模型；个人资料面板仅提供邮箱修改。

**说明**：注册邮箱验证（验证码确认邮箱真实）本次不做；已填邮箱的修改不做二次验证，变更即时生效。既有无邮箱用户若需重置密码，由站长在 Django 后台处理。
