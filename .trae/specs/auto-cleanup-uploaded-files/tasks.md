# Tasks

- [x] Task 1: 创建 content/signals.py，实现 Attachment 的 post_delete + pre_save 文件清理钩子
  - [x] SubTask 1.1: Attachment.post_delete 删除 file 字段对应磁盘文件
  - [x] SubTask 1.2: Attachment.pre_save 检测 file 字段从旧值换为新值时，删除旧文件
  - [x] SubTask 1.3: 文件不存在时静默跳过（不抛异常）
- [x] Task 2: 扩展 signals.py，覆盖 UserProfile.avatar 的 post_delete + pre_save
  - [x] SubTask 2.1: UserProfile.post_delete 删除 avatar 文件
  - [x] SubTask 2.2: UserProfile.pre_save avatar 替换时删旧文件
- [x] Task 3: 扩展 signals.py，覆盖 About 三张 lanyard 图的 pre_save
  - [x] SubTask 3.1: About.pre_save 检测 lanyard_image / card_front_image / card_back_image 字段变更，删旧文件
  - [x] SubTask 3.2: About 是单例（不删除），不实现 post_delete
- [x] Task 4: 在 content/apps.py 的 ready() 中导入 signals 注册
  - [x] SubTask 4.1: 修改 ready()，加入 `from . import signals`（加 noqa 防止 unused import 警告）
- [x] Task 5: 创建 management/commands/cleanup_orphan_media.py
  - [x] SubTask 5.1: 扫描所有 Post.content 与 Project.description，用正则提取所有 `/media/markdownx/...` 引用
  - [x] SubTask 5.2: 遍历 `media/markdownx/` 目录，列出未被引用的文件
  - [x] SubTask 5.3: 默认 dry-run 只输出清单+总大小；`--execute` 选项才真正删除
  - [x] SubTask 5.4: 输出已删除数量与释放空间
- [x] Task 6: 本地语法检查 + 在核桃派上验证
  - [x] SubTask 6.1: `python -m py_compile` 检查所有新增/修改文件
  - [x] SubTask 6.2: SSH 到核桃派同步代码、重启 gunicorn
  - [x] SubTask 6.3: 在核桃派用 Django shell 实测：创建附件→删除附件→确认磁盘文件消失
  - [x] SubTask 6.4: 在核桃派实测 `cleanup_orphan_media` dry-run 输出

# Task Dependencies
- [Task 4] depends on [Task 1, Task 2, Task 3]（signals.py 内容齐了再注册）
- [Task 6] depends on [Task 1, Task 2, Task 3, Task 4, Task 5]（全部代码就绪后统一验证）
