from rest_framework import serializers
from rest_framework.fields import SerializerMethodField
from .models import Post, Project, About, Attachment, Comment, Notification


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
    # 当前登录用户是否已赞（未登录恒为 False）
    liked = SerializerMethodField()

    class Meta:
        model = Post
        fields = ["id", "slug", "title", "date", "tags", "excerpt", "views", "likes", "comments", "liked"]

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
        fields = ["id", "slug", "title", "date", "tags", "excerpt", "content", "views", "likes", "comments", "liked", "attachments"]


class ProjectSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="slug", read_only=True)

    class Meta:
        model = Project
        fields = ["id", "slug", "name", "emoji", "tagline", "description", "tech", "status", "date", "url", "github", "related"]


class AboutSerializer(serializers.ModelSerializer):
    birthYear = serializers.IntegerField(source="birth_year")
    blogPurpose = serializers.JSONField(source="blog_purpose")

    class Meta:
        model = About
        fields = ["name", "school", "grade", "birthYear", "intro", "directions", "interests", "stats", "contact", "blogPurpose"]
