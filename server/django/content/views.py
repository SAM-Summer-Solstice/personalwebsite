import hashlib
import logging
import os
import secrets
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.http import FileResponse, Http404
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Post, Project, About, Attachment, Comment, Notification, PasswordResetCode
from .serializers import (
    PostListSerializer,
    PostDetailSerializer,
    ProjectSerializer,
    AboutSerializer,
    CommentSerializer,
    AttachmentSerializer,
    NotificationSerializer,
)

logger = logging.getLogger(__name__)

# 密码重置验证码参数
RESET_CODE_TTL = timedelta(minutes=10)
RESET_CODE_COOLDOWN = timedelta(seconds=60)
RESET_CODE_MAX_ATTEMPTS = 5

@api_view(["GET"])
def posts_list(request):
    qs = (
        Post.objects.annotate(
            comment_count=Count("comments_set", filter=Q(comments_set__is_approved=True))
        )
        # 聚合查询会丢弃 Meta.ordering（Django 已知行为），这里显式按日期倒序，否则按插入顺序返回
        .order_by("-date", "slug")
    )
    return Response(PostListSerializer(qs, many=True, context={"request": request}).data)

@api_view(["GET"])
def post_detail(request, pk):
    post = (
        Post.objects.annotate(
            comment_count=Count("comments_set", filter=Q(comments_set__is_approved=True))
        )
        .filter(slug=pk)
        .first()
    )
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
    """注册：用户名 + 邮箱 + 密码（>=6 位），创建普通用户。"""
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    email = (request.data.get("email") or "").strip()
    if not username or not password:
        return Response({"detail": "用户名和密码必填"}, status=400)
    if len(password) < 6:
        return Response({"detail": "密码至少 6 位"}, status=400)
    if not email:
        return Response({"detail": "邮箱必填"}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return Response({"detail": "邮箱格式不正确"}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"detail": "用户名已存在"}, status=400)
    user = User.objects.create_user(username=username, password=password, email=email)
    return Response({"id": user.id, "username": user.username}, status=201)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    """当前登录用户信息（需带 access token）；PATCH 可修改邮箱。"""
    u = request.user
    if request.method == "PATCH":
        email = (request.data.get("email") or "").strip()
        if not email:
            return Response({"detail": "邮箱必填"}, status=400)
        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "邮箱格式不正确"}, status=400)
        u.email = email
        u.save(update_fields=["email"])
    return Response({"id": u.id, "username": u.username, "email": u.email, "is_staff": u.is_staff, "is_superuser": u.is_superuser})


@api_view(["GET", "POST"])
def comments(request, pk):
    """帖子评论：GET 返回已审核评论（含回复）；POST 需登录发表新评论或回复。"""
    post = Post.objects.filter(slug=pk).first()
    if post is None:
        return Response({"detail": "Not found."}, status=404)
    if request.method == "GET":
        qs = post.comments_set.filter(is_approved=True).select_related("author", "parent")
        return Response(CommentSerializer(qs, many=True, context={"request": request}).data)
    if not request.user.is_authenticated:
        return Response({"detail": "请先登录"}, status=401)
    content = (request.data.get("content") or "").strip()
    if not content:
        return Response({"detail": "评论内容不能为空"}, status=400)
    parent = None
    parent_id = request.data.get("parent_id")
    if parent_id:
        parent = Comment.objects.filter(id=parent_id, post=post).first()
        if parent is None:
            return Response({"detail": "回复的目标评论不存在"}, status=400)
    c = Comment.objects.create(post=post, author=request.user, content=content, parent=parent)
    # 站内通知 + 邮件：回复了别人的评论（Task 5）
    if parent and parent.author_id != request.user.id:
        Notification.objects.create(recipient=parent.author, actor=request.user, comment=c, kind="reply")
        _send_reply_email(request, c, parent)
    return Response(CommentSerializer(c, context={"request": request}).data, status=201)


@api_view(["DELETE"])
def comment_detail(request, pk):
    """删除评论：仅作者本人或管理员（回复会随上级评论级联删除）。"""
    c = Comment.objects.filter(id=pk).first()
    if c is None:
        return Response({"detail": "Not found."}, status=404)
    if not request.user.is_authenticated:
        return Response({"detail": "请先登录"}, status=401)
    if c.author_id != request.user.id and not request.user.is_staff:
        return Response({"detail": "无权删除该评论"}, status=403)
    c.delete()
    return Response(status=204)


def _send_reply_email(request, reply, parent):
    """给被回复者发送回复通知邮件（失败仅记日志，不影响主流程）。"""
    recipient = parent.author
    if not recipient.email:
        return
    try:
        link = request.build_absolute_uri(f"/posts/{reply.post.slug}/")
        subject = f"你在博客收到了新回复：《{reply.post.title}》"
        body = f"{request.user.username} 回复了你在《{reply.post.title}》下的评论：\n\n{reply.content}\n\n查看链接：{link}"
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [recipient.email], fail_silently=True)
    except Exception:
        logger.warning("回复邮件发送失败", exc_info=True)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notifications(request):
    """当前用户的通知列表 + 未读数。"""
    qs = request.user.notifications.select_related("comment__post", "actor")
    return Response({"list": NotificationSerializer(qs, many=True).data, "unread_count": qs.filter(is_read=False).count()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notifications_read_all(request):
    """全部标记已读。"""
    request.user.notifications.filter(is_read=False).update(is_read=True)
    return Response({"detail": "ok"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def notification_read(request, pk):
    """单条通知标记已读。"""
    n = request.user.notifications.filter(id=pk).first()
    if n is None:
        return Response({"detail": "Not found."}, status=404)
    if not n.is_read:
        n.is_read = True
        n.save(update_fields=["is_read"])
    return Response({"detail": "ok"})


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


def _hash_code(code):
    """验证码只存哈希，不落明文。"""
    return hashlib.sha256(code.encode()).hexdigest()


def _new_code():
    """生成 6 位数字验证码。"""
    return f"{secrets.randbelow(10**6):06d}"


@api_view(["POST"])
def password_reset_request(request):
    """发送密码重置验证码（10 分钟有效；用户不存在也返回成功，防枚举）。"""
    email = (request.data.get("email") or "").strip()
    if not email:
        return Response({"detail": "邮箱必填"}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return Response({"detail": "邮箱格式不正确"}, status=400)
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        # 不区分“未注册”与“已发送”，避免账号枚举
        return Response({"detail": "若该邮箱已注册，验证码已发送"})
    latest = user.reset_codes.order_by("-created_at").first()
    if latest and not latest.used and latest.created_at > timezone.now() - RESET_CODE_COOLDOWN:
        return Response({"detail": "发送过于频繁，请稍后再试"}, status=400)
    user.reset_codes.filter(used=False).update(used=True)
    code = _new_code()
    PasswordResetCode.objects.create(
        user=user,
        code_hash=_hash_code(code),
        expires_at=timezone.now() + RESET_CODE_TTL,
    )
    try:
        subject = "博客密码重置验证码"
        body = f"你的验证码是：{code}\n10 分钟内有效，若非本人操作请忽略。"
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
    except Exception:
        logger.warning("密码重置邮件发送失败", exc_info=True)
    return Response({"detail": "验证码已发送至你的邮箱"})


@api_view(["POST"])
def password_reset_confirm(request):
    """校验验证码并重置密码（验证码错误 5 次后失效）。"""
    email = (request.data.get("email") or "").strip()
    code = (request.data.get("code") or "").strip()
    new_password = request.data.get("new_password") or ""
    if len(new_password) < 6:
        return Response({"detail": "新密码至少 6 位"}, status=400)
    user = User.objects.filter(email__iexact=email).first()
    rc = user.reset_codes.filter(used=False).order_by("-created_at").first() if user else None
    if rc is None or timezone.now() > rc.expires_at:
        if rc is not None and timezone.now() > rc.expires_at:
            rc.used = True
            rc.save(update_fields=["used"])
        return Response({"detail": "验证码已过期，请重新获取"}, status=400)
    if rc.attempts >= RESET_CODE_MAX_ATTEMPTS or not secrets.compare_digest(rc.code_hash, _hash_code(code)):
        rc.attempts += 1
        if rc.attempts >= RESET_CODE_MAX_ATTEMPTS:
            rc.used = True
        rc.save(update_fields=["attempts", "used"])
        return Response({"detail": "验证码错误或已失效"}, status=400)
    user.set_password(new_password)
    user.save()
    rc.used = True
    rc.save(update_fields=["used"])
    return Response({"detail": "密码已重置，请使用新密码登录"})
