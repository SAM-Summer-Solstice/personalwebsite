# Tasks

- [x] Task 1: 审查后端 settings 配置（base/dev/prod）并修复问题
  - [x] SubTask 1.1: 检查 DEBUG/SECRET_KEY/ALLOWED_HOSTS/CSRF/CORS 配置
  - [x] SubTask 1.2: 检查 MEDIA/STATIC/数据库/日志配置
  - [x] SubTask 1.3: 修复发现的问题并语法检查
- [x] Task 2: 审查 content 业务代码（models/views/serializers/admin/urls）并修复问题
  - [x] SubTask 2.1: 检查认证/权限/上传/序列化逻辑
  - [x] SubTask 2.2: 复查 markdownx_upload、_avatar_preview 已知修复
  - [x] SubTask 2.3: 修复发现的问题并语法检查
- [x] Task 3: 审查 signals + 管理命令并修复问题
  - [x] SubTask 3.1: 检查文件清理 signals 无误删
  - [x] SubTask 3.2: 复查 cleanup_orphan_media 路径匹配（MEDIA_URL 前缀）
  - [x] SubTask 3.3: 检查 import_md / reset_post_stats
  - [x] SubTask 3.4: 修复发现的问题并语法检查
- [x] Task 4: 审查前端认证与 API（AuthContext.jsx / api.js）并修复问题
  - [x] SubTask 4.1: 检查 token 存储与 401 处理
  - [x] SubTask 4.2: 检查错误处理与请求封装
  - [x] SubTask 4.3: 修复发现的问题
- [x] Task 5: 审查前端组件（MarkdownBody / CommentSection / sections）并修复问题
  - [x] SubTask 5.1: 检查 Markdown 渲染 XSS（marked 无 sanitize）
  - [x] SubTask 5.2: 检查空状态/内存泄漏/错误处理
  - [x] SubTask 5.3: 修复发现的问题
- [x] Task 6: 审查部署配置与脚本（nginx / gunicorn / deploy 脚本 / gitignore）并修复问题
  - [x] SubTask 6.1: 检查 nginx 代理/静态/上传大小限制
  - [x] SubTask 6.2: 检查 gunicorn.service worker/超时
  - [x] SubTask 6.3: 检查 deploy/*.sh 脚本正确性
  - [x] SubTask 6.4: 检查 .gitignore 覆盖完整性
  - [x] SubTask 6.5: 修复发现的问题
- [x] Task 7: 汇总发现 + 核桃派部署验证
  - [x] SubTask 7.1: 汇总各模块审查结果与修复清单
  - [x] SubTask 7.2: 语法检查所有修改文件
  - [x] SubTask 7.3: 核桃派实测关键路径（上传/清理/页面渲染）

# Task Dependencies
- [Task 7] depends on [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6]
- Task 1-6 之间无依赖，可并行执行
