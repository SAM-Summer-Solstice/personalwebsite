"""把文章的浏览/点赞数重置为真实值：浏览量归 0，点赞数以真实点赞用户集合（liked_by）为准。

用于部署后一次性清除从 md frontmatter 导入的假计数，之后全部由真实用户行为累计。
用法：python manage.py reset_post_stats --settings=blog_backend.settings.prod
"""
from django.core.management.base import BaseCommand
from content.models import Post


class Command(BaseCommand):
    help = "重置文章浏览/点赞数为真实值：views=0，likes=liked_by 真实用户数"

    def handle(self, *args, **options):
        updated = 0
        for post in Post.objects.all():
            post.views = 0
            post.likes = post.liked_by.count()
            post.save(update_fields=["views", "likes"])
            updated += 1
        self.stdout.write(self.style.SUCCESS(f"已重置 {updated} 篇文章的浏览/点赞数"))
