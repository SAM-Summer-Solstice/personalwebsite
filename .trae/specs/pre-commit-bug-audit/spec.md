# 全面 Bug 审查（Pre-commit Bug Audit）Spec

## Why
临近 commit，需要对整个项目（后端 Django + 前端 React + 核桃派部署）做一次系统性 bug 审查，找出并修复潜在缺陷，避免把已知问题（上传 500、cleanup 误删、XSS 风险等）带进提交。

## What Changes
- **后端审查**：settings（base/dev/prod）、content 业务代码（models/views/serializers/admin/urls）、signals、管理命令
- **前端审查**：认证与 API（AuthContext/api）、Markdown 渲染、组件状态与错误处理
- **安全审查**：XSS、CSRF、JWT 存储、敏感信息泄露
- **部署审查**：nginx、gunicorn/systemd、部署脚本、.gitignore
- **修复**：审查中发现的 bug 直接修复并验证

## Impact
- Affected specs: 相关历史 specs（auto-cleanup-uploaded-files、deploy-walnutpi、fullstack-django-refactor、content-attachments 等）
- Affected code:
  - `server/django/blog_backend/settings/`（base/dev/prod）
  - `server/django/content/`（models/views/serializers/admin/signals/urls/management/commands）
  - `src/`（api.js、auth/AuthContext.jsx、components/MarkdownBody.jsx、components/CommentSection.jsx、components/sections/*）
  - `deploy/`（nginx.conf、gunicorn.service、*.sh）
  - `.gitignore`

## ADDED Requirements

### Requirement: 后端配置审查
系统 SHALL 审查 settings 的 DEBUG、SECRET_KEY、ALLOWED_HOSTS、CSRF、CORS、MEDIA、STATIC、数据库、日志配置，修复错误或不安全的配置。

#### Scenario: 生产配置安全
- **WHEN** 审查 prod.py 及其依赖的环境变量
- **THEN** DEBUG=False、SECRET_KEY 来自环境变量、ALLOWED_HOSTS 正确、CSRF_TRUSTED_ORIGINS 正确

#### Scenario: 媒体/静态配置一致
- **WHEN** 审查 MEDIA_URL/MEDIA_ROOT 与 nginx 的 media 映射
- **THEN** 上传文件可访问，且与 cleanup_orphan_media 命令的路径一致

### Requirement: 后端业务代码审查
系统 SHALL 审查 content app 的 models/views/serializers/admin/urls，修复逻辑错误、权限缺失、上传缺陷。

#### Scenario: 上传无 500
- **WHEN** markdownx 上传视频/图片
- **THEN** 返回 200 而非 500

#### Scenario: 权限正确
- **WHEN** 未登录访问受保护接口
- **THEN** 返回 401/403 而非泄露数据

### Requirement: signals 与管理命令审查
系统 SHALL 审查文件清理 signals 与 cleanup_orphan_media 等管理命令，确保不误删被引用文件、无逻辑错误。

#### Scenario: cleanup 不误删
- **WHEN** 执行 cleanup_orphan_media
- **THEN** 被正文引用的文件不被判为孤儿

#### Scenario: signals 无副作用
- **WHEN** 文件字段从空变为有值或删除记录
- **THEN** 不报错、不误删、旧文件在替换时正确清理

### Requirement: 前端认证与 API 审查
系统 SHALL 审查 AuthContext.jsx 与 api.js 的 token 存储、401 处理、错误处理。

#### Scenario: token 安全
- **WHEN** 审查 token 存储与请求头注入
- **THEN** 无 XSS 可窃取的明文泄露风险，401 能正确清理会话并跳转登录

### Requirement: 前端组件审查
系统 SHALL 审查 MarkdownBody.jsx 的渲染安全与各组件空状态/错误处理。

#### Scenario: Markdown 无 XSS
- **WHEN** 正文包含恶意 HTML/脚本
- **THEN** 被转义或消毒，不执行脚本

#### Scenario: 组件健壮性
- **WHEN** 数据为空、加载中、请求失败
- **THEN** 无空引用崩溃、无未清理的定时器/监听器（内存泄漏）

### Requirement: 部署配置审查
系统 SHALL 审查 nginx.conf、gunicorn.service、deploy/*.sh、.gitignore，修复配置错误。

#### Scenario: 上传大小与代理正确
- **WHEN** 审查 nginx
- **THEN** client_max_body_size 覆盖上传需求，proxy 头正确，静态/媒体正确映射

#### Scenario: gitignore 完整
- **WHEN** 审查 .gitignore
- **THEN** media/、.env、venv、node_modules、dist 等生成物与敏感文件不入库

### Requirement: 审查发现的 bug 修复与验证
系统 SHALL 修复审查发现的 bug，并通过语法检查与核桃派实测验证关键路径。

#### Scenario: 修复可验证
- **WHEN** 完成修复
- **THEN** 所有修改文件通过 py_compile/语法检查，关键路径在核桃派实测通过

## MODIFIED Requirements
无（本 spec 为审查任务，不新增/修改既有功能，仅修复发现的 bug）

## REMOVED Requirements
无
