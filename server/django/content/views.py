import os
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.http import FileResponse, Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Post, Project, About, Attachment, Comment
from .serializers import (
    PostListSerializer,
    PostDetailSerializer,
    ProjectSerializer,
    AboutSerializer,
    CommentSerializer,
    AttachmentSerializer,
)

@api_view(["GET"])
def posts_list(request):
    qs = Post.objects.all()
    return Response(PostListSerializer(qs, many=True, context={"request": request}).data)

@api_view(["GET"])
def post_detail(request, pk):
    post = Post.objects.filter(slug=pk).first()
    if post is None:
        return Response({"detail": "Not found."}, status=404)
    return Response(PostDetailSerializer(post, context={"request": request}).data)

@api_view(["GET"])
def projects_list(request):
    qs = Project.objects.all()
    return Response(ProjectSerializer(qs, many=True, context={"request": request}).data)

@api_view(["GET"])
def about_detail(request):
    about = About.objects.first()
    if about is None:
        return Response({}, status=404)
    return Response(AboutSerializer(about, context={"request": request}).data)

@api_view(["POST"])
def increment_views(request, pk):
    post = Post.objects.filter(slug=pk).first()
    if post is None:
        return Response({"detail": "Not found."}, status=404)
    post.views = (post.views or 0) + 1
    post.save(update_fields=["views"])
    return Response({"views": post.views})


def react_spa(request, path=""):
    """托管 React 构建产物：命中文件直接返回，未命中回退 index.html（SPA）。"""
    dist = Path(settings.REACT_DIST)
    target = dist / path
    if target.is_file():
        return FileResponse(target.open("rb"))
    index = dist / "index.html"
    if index.is_file():
        return FileResponse(index.open("rb"))
    raise Http404


@api_view(["POST"])
def register(request):
    """注册：用户名 + 密码（>=6 位），创建普通用户。"""
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    email = (request.data.get("email") or "").strip()
    if not username or not password:
        return Response({"detail": "用户名和密码必填"}, status=400)
    if len(password) < 6:
        return Response({"detail": "密码至少 6 位"}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"detail": "用户名已存在"}, status=400)
    user = User.objects.create_user(username=username, password=password, email=email)
    return Response({"id": user.id, "username": user.username}, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """当前登录用户信息（需带 access token）。"""
    u = request.user
    return Response({"id": u.id, "username": u.username, "is_staff": u.is_staff, "is_superuser": u.is_superuser})


@api_view(["GET", "POST"])
def comments(request, pk):
    """帖子评论：GET 返回已审核评论；POST 需登录发表新评论。"""
    post = Post.objects.filter(slug=pk).first()
    if post is None:
        return Response({"detail": "Not found."}, status=404)
    if request.method == "GET":
        qs = post.comments_set.filter(is_approved=True).select_related("author")
        return Response(CommentSerializer(qs, many=True).data)
    if not request.user.is_authenticated:
        return Response({"detail": "请先登录"}, status=401)
    content = (request.data.get("content") or "").strip()
    if not content:
        return Response({"detail": "评论内容不能为空"}, status=400)
    c = Comment.objects.create(post=post, author=request.user, content=content)
    return Response(CommentSerializer(c).data, status=201)


@api_view(["POST"])
def toggle_like(request, pk):
    """切换点赞状态：已赞则取消，未赞则点赞。"""
    post = Post.objects.filter(slug=pk).first()
    if post is None:
        return Response({"detail": "Not found."}, status=404)
    if not request.user.is_authenticated:
        return Response({"detail": "请先登录"}, status=401)
    user = request.user
    if post.liked_by.filter(id=user.id).exists():
        post.liked_by.remove(user)
        post.likes = max(0, (post.likes or 0) - 1)
        liked = False
    else:
        post.liked_by.add(user)
        post.likes = (post.likes or 0) + 1
        liked = True
    post.save(update_fields=["likes"])
    return Response({"likes": post.likes, "liked": liked})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_attachment(request, pk):
    """上传帖子附件：需登录，multipart/form-data（file 必填、name 可选）。"""
    post = Post.objects.filter(slug=pk).first()
    if post is None:
        return Response({"detail": "Not found."}, status=404)
    f = request.FILES.get("file")
    if f is None:
        return Response({"detail": "缺少 file 字段"}, status=400)
    name = (request.data.get("name") or "").strip() or f.name
    att = Attachment.objects.create(post=post, file=f, name=name)
    return Response(AttachmentSerializer(att, context={"request": request}).data, status=201)


@api_view(["GET"])
def download_attachment(request, pk):
    """下载附件：以附件显示名作为下载文件名。"""
    att = Attachment.objects.filter(id=pk).first()
    if att is None:
        return Response({"detail": "Not found."}, status=404)
    filename = att.name or att.file.name.rsplit("/", 1)[-1]
    return FileResponse(att.file.open("rb"), as_attachment=True, filename=filename)
