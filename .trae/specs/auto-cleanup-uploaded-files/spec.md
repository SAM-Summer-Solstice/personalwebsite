# 删除时自动清理上传文件（Auto Cleanup Uploaded Files）Spec

## Why
当前所有上传文件（附件、吊牌三图、用户头像、markdownx 正文媒体）在后台删除对应记录或清除字段后，磁盘上的物理文件不会被删除，长期累积成孤儿文件，占用核桃派存储空间，并污染 `blog-media-backup` 备份仓库。需要：DB 记录删除时自动删磁盘文件；markdownx 无 DB 记录的文件提供扫描+清理命令。

## What Changes
- **Attachment 删除钩子**：`post_delete` 信号删除 `Attachment.file` 对应磁盘文件
- **Attachment 文件更新钩子**：`pre_save` 信号——当 `file` 字段被替换时，删除旧文件
- **UserProfile avatar 钩子**：`post_delete` 删头像；`pre_save` 字段被替换时删旧文件
- **About lanyard 三图钩子**：`pre_save` 字段被替换时删旧文件（About 是单例不删除，无需 post_delete）
- **markdownx 孤儿清理命令**：`python manage.py cleanup_orphan_media`，扫描所有 `Post.content` / `Project.description` 中引用的 `/media/markdownx/...` 路径，列出未被引用的文件；默认 dry-run 只列出，加 `--execute` 才真正删除
- **不引入新依赖**：全部用 Django signals + storage API + 标准库 `re`

## Impact
- Affected specs: 无直接关联（本仓库既有 specs 均为前端渲染相关）
- Affected code:
  - `server/django/content/signals.py`（新建：所有 post_delete/pre_save 钩子）
  - `server/django/content/apps.py`（ready() 中导入 signals 注册）
  - `server/django/content/management/commands/cleanup_orphan_media.py`（新建：扫描+清理命令）
  - `server/django/content/management/commands/__init__.py`（已存在，不改）

## ADDED Requirements

### Requirement: Attachment 删除时清理文件
系统 SHALL 在 Attachment 记录被删除时，自动删除其 `file` 字段对应的磁盘文件。

#### Scenario: 后台删除附件
- **WHEN** 管理员在后台删除某条 Attachment 记录
- **THEN** `media/attachments/` 下对应的物理文件被删除，不残留孤儿文件

#### Scenario: 级联删除（删 Post）
- **WHEN** 管理员删除某篇 Post，其关联的 Attachment 被 CASCADE 级联删除
- **THEN** 每个 Attachment 的物理文件均被删除

### Requirement: 文件字段替换时清理旧文件
系统 SHALL 在 Attachment.file / UserProfile.avatar / About.lanyard_image / About.card_front_image / About.card_back_image 字段被替换为新文件时，自动删除旧文件。

#### Scenario: 更换头像
- **WHEN** 用户上传新头像替换旧头像并保存
- **THEN** 旧头像文件被删除，只保留新头像

#### Scenario: 更换吊牌贴图
- **WHEN** 管理员在 About 单例编辑页更换 lanyard_image / card_front_image / card_back_image
- **THEN** 对应旧图被删除

#### Scenario: 字段从空变为有值
- **WHEN** 旧值为空（无旧文件），新值上传文件
- **THEN** 不报错，不尝试删除不存在的文件

### Requirement: markdownx 孤儿媒体清理命令
系统 SHALL 提供 `cleanup_orphan_media` 管理命令，扫描所有文章/项目正文，找出 `media/markdownx/` 下未被任何正文引用的文件。

#### Scenario: 默认 dry-run
- **WHEN** 执行 `python manage.py cleanup_orphan_media`
- **THEN** 列出所有未被引用的孤儿文件路径与总大小，不删除任何文件

#### Scenario: 执行清理
- **WHEN** 执行 `python manage.py cleanup_orphan_media --execute`
- **THEN** 删除列出的孤儿文件，输出已删除数量与释放空间

#### Scenario: 被引用的文件保留
- **WHEN** 某文件的 URL 出现在任意 Post.content 或 Project.description 中
- **THEN** 该文件不被判定为孤儿，不删除

### Requirement: 清理安全性
系统 SHALL 保证清理操作只影响 `media/markdownx/` 目录，且默认 dry-run。

#### Scenario: 不误删 attachments
- **WHEN** 执行清理命令
- **THEN** `media/attachments/`、`media/avatars/`、`media/lanyard/` 目录完全不受影响

## MODIFIED Requirements

### Requirement: content app 初始化
`content/apps.py` 的 `ready()` 方法中导入 `content.signals`，使信号在 Django 启动时注册。

## REMOVED Requirements

无。
