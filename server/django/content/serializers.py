from rest_framework import serializers
from rest_framework.fields import SerializerMethodField
from .models import Post, Project, About, Attachment, Comment


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
    """评论序列化：只暴露作者名。"""
    author = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "author", "content", "created_at"]


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
