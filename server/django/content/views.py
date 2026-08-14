import hashlib
import io
import logging
import os
import re
import secrets
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.http import FileResponse, Http404, JsonResponse
from django.utils import timezone
from django.db.models import Count, Q
from markdownx.forms import ImageForm
from markdownx.settings import MARKDOWNX_MEDIA_PATH
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import (
    Post,
    Project,
    About,
    Attachment,
    Comment,
    CommentLike,
    Favorite,
    Notification,
    PasswordResetCode,
    RateLimitHit,
    Report,
    SensitiveWord,
    UserProfile,
)
from .serializers import (
    PostListSerializer,
    PostDetailSerializer,
    ProjectSerializer,
    AboutSerializer,
    CommentSerializer,
    AttachmentSerializer,
    NotificationSerializer,
    UserStatsSerializer,
    UserPublicSerializer,
)

logger = logging.getLogger(__name__)

# 密码重置验证码参数
RESET_CODE_TTL = timedelta(minutes=10)
RESET_CODE_COOLDOWN = timedelta(seconds=60)
RESET_CODE_MAX_ATTEMPTS = 5

# 头像大小上限（上传原始文件 ≤2MB；处理压缩后落盘 ≤512KB）
AVATAR_MAX_BYTES = 2 * 1024 * 1024
AVATAR_TARGET_BYTES = 512 * 1024
AVATAR_EDGE = 256

# 评论内容长度上限
COMMENT_MAX_LEN = 1000

# ── IP 限频风控（DB 计数，核桃派 1GB 内存下不引入 Redis） ──────────────
# action → (窗口内允许次数, 窗口秒数)
RATE_LIMITS = {
    "register": (3, 24 * 3600),       # 每 IP 每天最多注册 3 个账号
    "login_fail": (20, 15 * 60),      # 每 IP 15 分钟内最多失败 20 次（防爆破；局域网共享出口 IP，阈值放宽避免误伤）
    "reset_request": (3, 3600),       # 每 IP 每小时最多请求 3 次验证码
    "comment_ip": (60, 24 * 3600),    # 每 IP 每天最多 60 条评论（正常用户远达不到）
    "report": (5, 3600),              # 每 IP 每小时最多举报 5 次
}
# 单用户维度：评论最小间隔与每日上限
COMMENT_MIN_INTERVAL = timedelta(seconds=10)
COMMENT_USER_DAILY_MAX = 30

# 新注册账号评论审核窗口：注册 24 小时内的评论默认进审核队列（防广告号）
NEW_ACCOUNT_AUDIT_WINDOW = timedelta(hours=24)

# @提及用户名匹配：字母数字下划线或常见中文昵称，1-20 字符
MENTION_RE = re.compile(r"@([\w\u4e00-\u9fa5]{1,20})")


def _client_ip(request):
    """取客户端真实 IP：nginx 已配置 X-Forwarded-For / X-Real-IP，直连时回退 REMOTE_ADDR。"""
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("HTTP_X_REAL_IP") or request.META.get("REMOTE_ADDR") or "unknown"


def _rate_limited(ip, action, limit, window_seconds):
    """窗口内计数是否超限；顺带以约 1/64 概率清理 48h 前的过期记录（省存储、免定时任务）。"""
    if secrets.randbelow(64) == 0:
        RateLimitHit.objects.filter(created_at__lt=timezone.now() - timedelta(hours=48)).delete()
    cutoff = timezone.now() - timedelta(seconds=window_seconds)
    return RateLimitHit.objects.filter(ip=ip, action=action, created_at__gte=cutoff).count() >= limit


def _record_hit(ip, action):
    RateLimitHit.objects.create(ip=ip, action=action)


def _muted_message(user):
    """用户在禁言中时返回可展示的提示文案，未禁言返回 None。"""
    profile = getattr(user, "profile", None)
    if not profile:
        return None
    if profile.is_muted_forever:
        return "你已被永久禁言，无法发表评论"
    if profile.muted_until and timezone.now() < profile.muted_until:
        local = timezone.localtime(profile.muted_until)
        return f"你已被禁言，解禁时间：{local:%Y-%m-%d %H:%M}"
    return None


def _contains_sensitive(text):
    """评论是否命中敏感词库（子串匹配，英文忽略大小写；词库较小，直接遍历）。"""
    lowered = text.lower()
    return SensitiveWord.objects.filter().exists() and any(
        w.word.lower() in lowered for w in SensitiveWord.objects.all()
    )


def _extract_mentions(text):
    """提取 @用户名 提及（排除重复与自身，只保留真实存在的用户）。"""
    names = set(MENTION_RE.findall(text))
    if not names:
        return []
    return list(User.objects.filter(username__in=names))


def _avatar_url(user):
    """用户的头像相对路径（/media/...），未上传返回 None。"""
    profile = getattr(user, "profile", None)
    return profile.avatar.url if profile and profile.avatar else None

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


@api_view(["GET"])
def users_list(request):
    """注册用户墙：真实评论数（仅已审核），按评论数降序、注册时间升序。"""
    qs = (
        User.objects.annotate(
            comment_count=Count("comment", filter=Q(comment__is_approved=True))
        )
        .filter(is_active=True)
        .order_by("-comment_count", "date_joined")
    )
    return Response(UserStatsSerializer(qs, many=True).data)

@api_view(["GET"])
def user_profile_detail(request, username):
    """用户个人主页：资料 + 该用户近期已审核评论（含所在文章，前台可点击跳转）。"""
    user = User.objects.filter(username=username, is_active=True).first()
    if user is None:
        return Response({"detail": "Not found."}, status=404)
    profile = UserPublicSerializer(user, context={"request": request}).data
    # 注意：Comment.author 未显式设 related_name，实例反向属性是 comment_set
    # （聚合里能写 "comment" 是 related_query_name 提供的查询名，属性访问不通用）
    comments_qs = (
        Comment.objects.filter(author=user, is_approved=True)
        .select_related("post")
        .order_by("-created_at")[:20]
    )
    profile["comments"] = [
        {
            "id": c.id,
            "content": c.content,
            "created_at": c.created_at,
            "post_slug": c.post.slug,
            "post_title": c.post.title,
        }
        for c in comments_qs
    ]
    return Response(profile)


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


def markdownx_upload(request):
    """markdownx 编辑器上传接口（替代默认 ImageUploadView）。

    markdownx 4.0.9 的 ImageForm.save() 会对所有非 SVG/GIF 文件调用 PIL 处理，
    mp4/webm/ogg 视频会直接抛异常导致 500。这里复用其类型/大小校验，
    但保存时跳过 PIL：图片直接落盘，视频落盘并返回 <video> 标签。
    """
    form = ImageForm(request.POST, request.FILES)
    if not form.is_valid():
        return JsonResponse(form.errors, status=400)

    upload = request.FILES["image"]
    ext = os.path.splitext(upload.name)[1]
    unique_name = f"{uuid4().hex}{ext}"
    full_path = os.path.join(MARKDOWNX_MEDIA_PATH, unique_name)
    saved_path = default_storage.save(full_path, upload)
    url = default_storage.url(saved_path)

    if upload.content_type.startswith("video/"):
        # 视频：marked 会把 ![]() 渲染成 <img>，必须用 <video> 标签才能播放
        image_code = f'<video src="{url}" controls></video>'
    else:
        image_code = f"![]({url})"
    return JsonResponse({"image_code": image_code})


@api_view(["POST"])
def register(request):
    """注册：用户名 + 邮箱 + 密码（>=6 位），创建普通用户；按 IP 限频风控。"""
    ip = _client_ip(request)
    limit, window = RATE_LIMITS["register"]
    if _rate_limited(ip, "register", limit, window):
        return Response({"detail": "当前网络注册过于频繁，请明天再试"}, status=429)
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    email = (request.data.get("email") or "").strip()
    if not username or not password:
        return Response({"detail": "用户名和密码必填"}, status=400)
    if len(username) > 20:
        return Response({"detail": "用户名最长 20 个字符"}, status=400)
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
    if User.objects.filter(email__iexact=email).exists():
        return Response({"detail": "该邮箱已注册"}, status=400)
    user = User.objects.create_user(username=username, password=password, email=email)
    _record_hit(ip, "register")
    return Response({"id": user.id, "username": user.username}, status=201)


class LoginView(TokenObtainPairView):
    """登录（JWT）：失败按 IP 限频防爆破，成功不计入失败计数。"""

    def post(self, request, *args, **kwargs):
        ip = _client_ip(request)
        limit, window = RATE_LIMITS["login_fail"]
        if _rate_limited(ip, "login_fail", limit, window):
            return Response({"detail": "登录失败次数过多，请 15 分钟后再试"}, status=429)
        # 注意：TokenObtainPairSerializer(raise_exception=True) 会直接抛出 AuthenticationFailed，
        # 由外层 DRF dispatch 的 handle_exception 转成 401——super().post() 并不会正常返回响应，
        # 因此这里用 try/except 记录失败后重新抛出，才能让 401 语义与限频计数同时生效
        try:
            return super().post(request, *args, **kwargs)
        except Exception:
            _record_hit(ip, "login_fail")
            raise


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    """当前登录用户信息（需带 access token）；PATCH 可修改邮箱 / 个性签名。"""
    u = request.user
    if request.method == "PATCH":
        email = (request.data.get("email") or "").strip()
        bio = (request.data.get("bio") or "").strip()
        changed = []
        if email:
            try:
                validate_email(email)
            except ValidationError:
                return Response({"detail": "邮箱格式不正确"}, status=400)
            u.email = email
            changed.append("email")
        if request.data.get("bio") is not None:
            if len(bio) > 200:
                return Response({"detail": "个性签名最长 200 字"}, status=400)
            profile, _ = UserProfile.objects.get_or_create(user=u)
            profile.bio = bio
            profile.save(update_fields=["bio"])
        if changed:
            u.save(update_fields=changed)
    profile = getattr(u, "profile", None)
    muted_until = profile.muted_until if profile else None
    return Response(
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "avatar": _avatar_url(u),
            "bio": profile.bio if profile else "",
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "is_active": u.is_active,
            "is_muted": profile.is_muted if profile else False,
            "muted_until": muted_until.isoformat() if muted_until else None,
            "email_verified": profile.email_verified if profile else False,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """上传/更换头像：multipart/form-data（file 必填），原始 ≤2MB 且须为合法图片。

    为省磁盘（核桃派存储有限）：缩放到 ≤256×256、转 WebP（失败回退 JPEG）落盘，
    目标 ≤512KB；同时删除旧头像文件，避免存储只增不减。
    """
    f = request.FILES.get("file")
    if f is None:
        return Response({"detail": "缺少 file 字段"}, status=400)
    if f.size > AVATAR_MAX_BYTES:
        return Response({"detail": "头像图片不能超过 2MB"}, status=400)
    try:
        from PIL import Image

        f.seek(0)
        img = Image.open(f)
        img.verify()
        f.seek(0)
        img = Image.open(f)
        # 统一转 RGB（透明图保留 RGBA），缩放到 256 内
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        img.thumbnail((AVATAR_EDGE, AVATAR_EDGE), Image.LANCZOS)
        buf = io.BytesIO()
        ext = "webp"
        try:
            img.save(buf, "WEBP", quality=82)
        except Exception:
            ext = "jpg"
            if img.mode == "RGBA":
                img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=82)
        if buf.tell() > AVATAR_TARGET_BYTES:
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=68)
            ext = "jpg"
        buf.seek(0)
    except Exception:
        return Response({"detail": "请上传有效的图片文件"}, status=400)
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.avatar:
        profile.avatar.delete(save=False)  # 清理旧头像文件，节省磁盘
    profile.avatar.save(f"{request.user.id}_{uuid4().hex[:10]}.{ext}", ContentFile(buf.read()), save=False)
    profile.save(update_fields=["avatar"])
    return Response({"avatar": profile.avatar.url})


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
    # 禁言/封禁检查：被禁用户禁止发言（历史评论保留可见）
    muted_msg = _muted_message(request.user)
    if muted_msg:
        return Response({"detail": muted_msg}, status=403)
    content = (request.data.get("content") or "").strip()
    if not content:
        return Response({"detail": "评论内容不能为空"}, status=400)
    if len(content) > COMMENT_MAX_LEN:
        return Response({"detail": f"评论最长 {COMMENT_MAX_LEN} 字"}, status=400)
    # 发言限频：用户维度（最小间隔 + 每日上限）与 IP 维度（每日上限）
    last = Comment.objects.filter(author=request.user, created_at__gte=timezone.now() - COMMENT_MIN_INTERVAL).exists()
    if last:
        return Response({"detail": "发言太快了，请稍等几秒"}, status=429)
    day_ago = timezone.now() - timedelta(hours=24)
    if Comment.objects.filter(author=request.user, created_at__gte=day_ago).count() >= COMMENT_USER_DAILY_MAX:
        return Response({"detail": "今日发言次数已达上限"}, status=429)
    ip = _client_ip(request)
    ip_limit, ip_window = RATE_LIMITS["comment_ip"]
    if _rate_limited(ip, "comment_ip", ip_limit, ip_window):
        return Response({"detail": "当前网络发言过于频繁，请稍后再试"}, status=429)
    parent = None
    parent_id = request.data.get("parent_id")
    if parent_id:
        parent = Comment.objects.filter(id=parent_id, post=post).first()
        if parent is None:
            return Response({"detail": "回复的目标评论不存在"}, status=400)
    # 审核策略：敏感词命中或新注册账号（24h 内）→ 进审核队列（is_approved=False）；其余直发
    approved = not _contains_sensitive(content) and request.user.date_joined < timezone.now() - NEW_ACCOUNT_AUDIT_WINDOW
    c = Comment.objects.create(post=post, author=request.user, content=content, parent=parent, is_approved=approved)
    _record_hit(ip, "comment_ip")
    if approved:
        # 站内通知 + 邮件：回复了别人的评论
        if parent and parent.author_id != request.user.id:
            Notification.objects.create(recipient=parent.author, actor=request.user, comment=c, kind="reply")
            _send_reply_email(request, c, parent)
        # @提及通知：@用户名 的用户收到 mention 通知（排除自己与已通知的回复对象）
        notified = {parent.author_id} if parent else set()
        for mentioned in _extract_mentions(content):
            if mentioned.id != request.user.id and mentioned.id not in notified:
                Notification.objects.create(recipient=mentioned, actor=request.user, comment=c, kind="mention")
                notified.add(mentioned.id)
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report_comment(request, pk):
    """举报评论：首个举报自动隐藏该评论（待管理员复核），每人每评论限举报一次；按 IP 限频。"""
    c = Comment.objects.filter(id=pk, is_approved=True).first()
    if c is None:
        return Response({"detail": "Not found."}, status=404)
    if c.author_id == request.user.id:
        return Response({"detail": "不能举报自己的评论"}, status=400)
    ip = _client_ip(request)
    limit, window = RATE_LIMITS["report"]
    if _rate_limited(ip, "report", limit, window):
        return Response({"detail": "举报过于频繁，请稍后再试"}, status=429)
    reason = (request.data.get("reason") or "").strip()[:200]
    if Report.objects.filter(comment=c, reporter=request.user).exists():
        return Response({"detail": "你已经举报过这条评论"}, status=400)
    Report.objects.create(comment=c, reporter=request.user, reason=reason)
    # 自动隐藏待复核：被举报评论立即从公共列表消失（后台可恢复或删除）
    c.is_approved = False
    c.save(update_fields=["is_approved"])
    _record_hit(ip, "report")
    return Response({"detail": "已举报，评论已隐藏，等待管理员复核"})


@api_view(["POST"])
def toggle_comment_like(request, pk):
    """切换评论点赞：已赞则取消，未赞则点赞（被禁言用户也可点赞，禁言仅限发言）。"""
    c = Comment.objects.filter(id=pk, is_approved=True).first()
    if c is None:
        return Response({"detail": "Not found."}, status=404)
    if not request.user.is_authenticated:
        return Response({"detail": "请先登录"}, status=401)
    record = CommentLike.objects.filter(comment=c, user=request.user).first()
    if record:
        record.delete()
        c.likes = max(0, (c.likes or 0) - 1)
        liked = False
    else:
        CommentLike.objects.create(comment=c, user=request.user)
        c.likes = (c.likes or 0) + 1
        liked = True
    c.save(update_fields=["likes"])
    return Response({"likes": c.likes, "liked": liked})


@api_view(["POST"])
def toggle_favorite(request, pk):
    """切换文章收藏：已收藏则取消，未收藏则收藏。"""
    post = Post.objects.filter(slug=pk).first()
    if post is None:
        return Response({"detail": "Not found."}, status=404)
    if not request.user.is_authenticated:
        return Response({"detail": "请先登录"}, status=401)
    fav = Favorite.objects.filter(post=post, user=request.user).first()
    if fav:
        fav.delete()
        favorited = False
    else:
        Favorite.objects.create(post=post, user=request.user)
        favorited = True
    return Response({"favorited": favorited})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def favorites_list(request):
    """当前用户的收藏列表（含文章信息，供个人面板展示）。"""
    qs = request.user.favorites.select_related("post").all()
    return Response(
        [
            {
                "slug": f.post.slug,
                "title": f.post.title,
                "date": f.post.date,
                "created_at": f.created_at,
            }
            for f in qs
        ]
    )


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
    """发送密码重置验证码（10 分钟有效；用户不存在也返回成功，防枚举）；按 IP 限频。"""
    ip = _client_ip(request)
    limit, window = RATE_LIMITS["reset_request"]
    if _rate_limited(ip, "reset_request", limit, window):
        return Response({"detail": "请求过于频繁，请稍后再试"}, status=429)
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
    _record_hit(ip, "reset_request")
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
