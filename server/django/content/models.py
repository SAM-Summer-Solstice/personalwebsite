from django.db import models
from markdownx.models import MarkdownxField

class Post(models.Model):
    # slug 沿用原 md 的 id（如 arm-inverse-kinematics），作为对外唯一标识
    slug = models.CharField("标识", max_length=200, unique=True)
    title = models.CharField("标题", max_length=300)
    date = models.DateField("日期")
    tags = models.JSONField("标签", default=list)
    excerpt = models.TextField("摘要")
    content = MarkdownxField("正文 Markdown")
    views = models.PositiveIntegerField("浏览量", default=0)
    likes = models.PositiveIntegerField("点赞数", default=0)
    comments = models.JSONField("评论（预留）", default=list)

    class Meta:
        ordering = ["-date", "slug"]

    def __str__(self):
        return self.title


class Project(models.Model):
    slug = models.CharField("标识", max_length=200, unique=True)
    name = models.CharField("名称", max_length=200)
    emoji = models.CharField("Emoji", max_length=16, default="")
    tagline = models.CharField("一句话简介", max_length=300, default="")
    description = models.TextField("详细描述", default="")
    tech = models.JSONField("技术栈", default=list)
    status = models.CharField("状态", max_length=20, default="")
    date = models.DateField("日期")
    url = models.URLField("Demo 链接", blank=True, default="")
    github = models.URLField("GitHub 链接", blank=True, default="")
    related = models.JSONField("相关项目", default=list)

    class Meta:
        ordering = ["-date", "slug"]

    def __str__(self):
        return self.name


class About(models.Model):
    # 单例（id=1），后台编辑个人信息
    name = models.CharField("姓名", max_length=100)
    school = models.CharField("学校", max_length=100, default="")
    grade = models.CharField("年级", max_length=100, default="")
    birth_year = models.IntegerField("出生年份", default=2006)
    intro = models.JSONField("简介段落", default=list)
    directions = models.JSONField("学习方向", default=list)
    interests = models.JSONField("兴趣爱好", default=list)
    stats = models.JSONField("一些数据 [{label,value}]", default=list)
    contact = models.JSONField("联系方式 {email,github,location}", default=dict)
    blog_purpose = models.JSONField("博客初衷段落", default=list)

    def __str__(self):
        return self.name
