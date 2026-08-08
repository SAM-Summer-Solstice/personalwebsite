import os
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Post, Project, About
from .serializers import PostListSerializer, PostDetailSerializer, ProjectSerializer, AboutSerializer

@api_view(["GET"])
def posts_list(request):
    qs = Post.objects.all()
    return Response(PostListSerializer(qs, many=True).data)

@api_view(["GET"])
def post_detail(request, pk):
    post = Post.objects.filter(slug=pk).first()
    if post is None:
        return Response({"detail": "Not found."}, status=404)
    return Response(PostDetailSerializer(post).data)

@api_view(["GET"])
def projects_list(request):
    qs = Project.objects.all()
    return Response(ProjectSerializer(qs, many=True).data)

@api_view(["GET"])
def about_detail(request):
    about = About.objects.first()
    if about is None:
        return Response({}, status=404)
    return Response(AboutSerializer(about).data)

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
