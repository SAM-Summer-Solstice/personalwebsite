from rest_framework import serializers
from .models import Post, Project, About

# 对外 id 使用 slug（沿用原 md 的 id，前端字段不变）
class PostListSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="slug", read_only=True)

    class Meta:
        model = Post
        fields = ["id", "slug", "title", "date", "tags", "excerpt", "views", "likes", "comments"]


class PostDetailSerializer(PostListSerializer):
    class Meta(PostListSerializer.Meta):
        fields = ["id", "slug", "title", "date", "tags", "excerpt", "content", "views", "likes", "comments"]


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
