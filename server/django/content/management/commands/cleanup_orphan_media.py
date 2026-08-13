"""清理 markdownx 上传但未被任何正文引用的孤儿媒体文件。

markdownx 上传的图片/视频落在 media/markdownx/，无 DB 记录，删除文章后文件会残留。
本命令扫描 Post.content 与 Project.description 中所有 /media/markdownx/ 引用，
对 markdownx 目录下的文件做比对，未被引用者视为孤儿。

用法：
  python manage.py cleanup_orphan_media                       # dry-run，仅列出
  python manage.py cleanup_orphan_media --execute             # 实际删除
  python manage.py cleanup_orphan_media --settings=blog_backend.settings.prod --execute
"""
import os
import re
from django.conf import settings
from django.core.management.base import BaseCommand
from content.models import Post, Project

PATTERN = re.compile(r'/media/markdownx/[^\s)"\'>]+')


def normalize(ref):
    path = ref.split('?', 1)[0].split('#', 1)[0]
    return path


class Command(BaseCommand):
    help = "清理 media/markdownx/ 下未被正文引用的孤儿媒体文件（默认 dry-run，加 --execute 才真删）"

    def add_arguments(self, parser):
        parser.add_argument(
            '--execute',
            action='store_true',
            default=False,
            help='实际执行删除；默认仅 dry-run 列出孤儿文件',
        )

    def handle(self, *args, **options):
        execute = options['execute']

        chunks = []
        for post in Post.objects.only('content'):
            if post.content:
                chunks.append(post.content)
        for project in Project.objects.only('description'):
            if project.description:
                chunks.append(project.description)
        blob = '\n'.join(chunks)

        referenced = {normalize(m) for m in PATTERN.findall(blob)}

        markdownx_dir = os.path.join(str(settings.MEDIA_ROOT), 'markdownx')
        if not os.path.isdir(markdownx_dir):
            self.stdout.write(self.style.WARNING(f"目录不存在，跳过：{markdownx_dir}"))
            return

        orphans = []
        for root, _dirs, files in os.walk(markdownx_dir):
            for name in files:
                abs_path = os.path.join(root, name)
                rel = os.path.relpath(abs_path, str(settings.MEDIA_ROOT)).replace(os.sep, '/')
                rel_path = settings.MEDIA_URL.rstrip('/') + '/' + rel
                if rel_path in referenced:
                    continue
                orphans.append(abs_path)

        if not orphans:
            self.stdout.write(self.style.SUCCESS("未发现孤儿文件，markdownx 目录已干净"))
            return

        total_bytes = 0
        for abs_path in orphans:
            try:
                size = os.path.getsize(abs_path)
            except OSError:
                size = 0
            total_bytes += size
            self.stdout.write(f"{abs_path}  ({size} 字节)")

        if not execute:
            self.stdout.write(
                self.style.WARNING(
                    f"共发现 {len(orphans)} 个孤儿文件，合计 {total_bytes} 字节"
                )
            )
            self.stdout.write("当前为 dry-run，未删除任何文件；加 --execute 执行实际删除")
            return

        deleted = 0
        freed = 0
        for abs_path in orphans:
            try:
                size = os.path.getsize(abs_path)
            except OSError:
                size = 0
            try:
                os.remove(abs_path)
                deleted += 1
                freed += size
            except OSError as exc:
                self.stdout.write(self.style.ERROR(f"删除失败：{abs_path}  {exc}"))

        self.stdout.write(
            self.style.SUCCESS(f"已删除 {deleted} 个孤儿文件，释放 {freed} 字节空间")
        )
