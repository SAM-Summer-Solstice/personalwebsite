import subprocess
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.fields import SerializerMethodField
from .models import Post, Project, About, Attachment, Comment, Notification


# 「一些数据」里代码提交数的统计结果缓存（提交数只在部署时变化，10 分钟 TTL 避免每次请求都跑 git）
_GIT_STATS_CACHE = {"t": 0.0, "n": 0}
_GIT_STATS_TTL = 600


def _git_commit_count():
    """实时统计仓库提交数：在项目根运行 git rev-list --count HEAD，失败返回 0（不阻塞页面）。"""
    import time

    now = time.monotonic()
    if now - _GIT_STATS_CACHE["t"] < _GIT_STATS_TTL:
        return _GIT_STATS_CACHE["n"]
    repo = Path(settings.BASE_DIR).resolve().parent.parent  # server/django 上两级 = 项目根
    try:
        out = subprocess.run(
            ["git", "rev-list", "--count", "HEAD"],
            cwd=repo,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if out.returncode == 0:
            _GIT_STATS_CACHE["n"] = int(out.stdout.strip() or 0)
        else:
            _GIT_STATS_CACHE["n"] = 0
    except Exception:
        _GIT_STATS_CACHE["n"] = 0
    _GIT_STATS_CACHE["t"] = now
    return _GIT_STATS_CACHE["n"]


class AttachmentSerializer(serializers.ModelSerializer):
    """附件序列化：附上文件大小与类型（image/video/file）。"""
    size = serializers.SerializerMethodField()
    kind = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ["id", "name", "file", "size", "kind", "uploaded_at"]

    def get_size(self, obj):
        try:
            return obj.file.size
        except OSError:
            return 0

    def get_kind(self, obj):
        ext = obj.file.name.rsplit(".", 1)[-1].lower() if "." in obj.file.name else ""
        if ext in ("jpg", "jpeg", "png", "gif", "webp"):
            return "image"
        if ext in ("mp4", "webm", "ogg", "mov"):
            return "video"
        return "file"


class CommentSerializer(serializers.ModelSerializer):
    """评论序列化：只暴露作者名，附带父评论与归属判断。"""
    author = serializers.CharField(source="author.username", read_only=True)
    author_id = serializers.IntegerField(source="author.id", read_only=True)
    parent = serializers.IntegerField(source="parent_id", read_only=True, allow_null=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "parent", "author", "author_id", "content", "created_at", "is_mine"]

    def get_is_mine(self, obj):
        """当前登录用户是否为该评论作者。"""
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return obj.author_id == user.id


class NotificationSerializer(serializers.ModelSerializer):
    """站内通知序列化：附被回复评论所在文章与预览。"""
    actor = serializers.CharField(source="actor.username", read_only=True)
    post_slug = serializers.CharField(source="comment.post.slug", read_only=True)
    post_title = serializers.CharField(source="comment.post.title", read_only=True)
    comment_preview = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "kind", "actor", "post_slug", "post_title", "comment_preview", "is_read", "created_at"]

    def get_comment_preview(self, obj):
        """评论内容前 80 个字符作为预览。"""
        return obj.comment.content[:80]


# 对外 id 使用 slug（沿用原 md 的 id，前端字段不变）
class PostListSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="slug", read_only=True)
    # 真实评论数：来自 views.py 的 Count 注解（仅统计已审核评论）
    comment_count = serializers.IntegerField(read_only=True)
    # 当前登录用户是否已赞（未登录恒为 False）
    liked = SerializerMethodField()

    class Meta:
        model = Post
        fields = ["id", "slug", "title", "date", "tags", "excerpt", "views", "likes", "comment_count", "liked"]

    def get_liked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return obj.liked_by.filter(id=user.id).exists()


class PostDetailSerializer(PostListSerializer):
    # 帖子附件列表（图片/视频/普通文件），供前台展示与下载
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta(PostListSerializer.Meta):
        fields = ["id", "slug", "title", "date", "tags", "excerpt", "content", "views", "likes", "comment_count", "liked", "attachments"]


class ProjectSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="slug", read_only=True)

    class Meta:
        model = Project
        fields = ["id", "slug", "name", "emoji", "tagline", "description", "tech", "status", "date", "url", "github", "related"]


class AboutSerializer(serializers.ModelSerializer):
    birthYear = serializers.IntegerField(source="birth_year")
    blogPurpose = serializers.JSONField(source="blog_purpose")
    # 「一些数据」实时统计：项目/文章数来自数据库，代码提交数来自 git 仓库
    stats = SerializerMethodField()
    # 吊牌三图（后台上传，返回相对路径 /media/...，前端拼 origin；留空返回 null 走前端默认图）
    lanyardImage = SerializerMethodField()
    cardFrontImage = SerializerMethodField()
    cardBackImage = SerializerMethodField()

    class Meta:
        model = About
        fields = ["name", "school", "grade", "birthYear", "intro", "directions", "interests", "stats", "contact", "blogPurpose", "lanyardImage", "cardFrontImage", "cardBackImage"]

    def get_stats(self, obj):
        return [
            {"label": "项目", "value": Project.objects.count()},
            {"label": "文章", "value": Post.objects.count()},
            {"label": "代码提交", "value": _git_commit_count()},
        ]

    def get_lanyardImage(self, obj):
        return obj.lanyard_image.url if obj.lanyard_image else None

    def get_cardFrontImage(self, obj):
        return obj.card_front_image.url if obj.card_front_image else None

    def get_cardBackImage(self, obj):
        return obj.card_back_image.url if obj.card_back_image else None


class UserStatsSerializer(serializers.ModelSerializer):
    """注册用户墙：用户名 + 真实评论数（仅已审核），joined 为注册年月。"""
    comment_count = serializers.IntegerField(read_only=True)
    joined = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["username", "comment_count", "joined"]

    def get_joined(self, obj):
        return obj.date_joined.strftime("%Y-%m")
