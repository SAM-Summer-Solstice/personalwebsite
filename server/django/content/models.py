from django.conf import settings
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
    # 点赞用户集合（保留原 likes 数值字段作为计数基数）
    liked_by = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="liked_posts")
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


class Attachment(models.Model):
    """帖子附件：文件上传到 media/attachments/，前台提供下载。"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="attachments/")
    name = models.CharField("显示名", max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or self.file.name


class Comment(models.Model):
    """帖子评论：登录用户发表，默认直接显示，后台可审核。"""
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments_set")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies", verbose_name="上级评论")
    content = models.TextField("内容")
    created_at = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField("已审核", default=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.author.username}: {self.content[:20]}"


class Notification(models.Model):
    """站内通知：回复评论时通知被回复者（另有邮件兜底）。"""
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notified_actors")
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField("类型", max_length=20, default="reply")
    is_read = models.BooleanField("已读", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.actor} -> {self.recipient}: {self.comment_id}"


class PasswordResetCode(models.Model):
    """密码重置验证码：哈希存储，10 分钟有效，最多尝试 5 次。"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reset_codes")
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} code"


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
