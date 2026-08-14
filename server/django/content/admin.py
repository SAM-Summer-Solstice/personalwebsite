from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.html import mark_safe
from markdownx.admin import MarkdownxModelAdmin
from .models import Post, Project, About, Attachment, Comment, Notification, PasswordResetCode, UserProfile, RateLimitHit


class AttachmentInline(admin.TabularInline):
    """帖子附件内联编辑（在帖子后台直接管理附件）。"""
    model = Attachment
    extra = 1


@admin.register(Post)
class PostAdmin(MarkdownxModelAdmin):
    list_display = ("title", "date", "views", "likes")
    search_fields = ("title", "excerpt")
    list_filter = ("date",)
    prepopulated_fields = {"slug": ("title",)}
    inlines = [AttachmentInline]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """评论管理：支持批量审核通过/驳回。"""
    list_display = ("post", "author", "parent", "created_at", "is_approved")
    list_filter = ("is_approved",)
    actions = ["approve_comments", "reject_comments"]

    @admin.action(description="通过选中评论")
    def approve_comments(self, request, queryset):
        """批量通过评论审核。"""
        queryset.update(is_approved=True)

    @admin.action(description="驳回选中评论")
    def reject_comments(self, request, queryset):
        """批量驳回评论（驳回后前台不可见）。"""
        queryset.update(is_approved=False)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """站内通知管理。"""
    list_display = ("recipient", "actor", "comment", "is_read", "created_at")
    list_filter = ("is_read",)


@admin.register(PasswordResetCode)
class PasswordResetCodeAdmin(admin.ModelAdmin):
    """密码重置验证码（仅存哈希，后台不可见明文）。"""
    list_display = ("user", "created_at", "expires_at", "used")
    readonly_fields = ("code_hash",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "date")
    search_fields = ("name", "tagline")
    list_filter = ("status",)

@admin.register(About)
class AboutAdmin(admin.ModelAdmin):
    # 单例：只允许存在一条记录
    def has_add_permission(self, request):
        return not About.objects.exists()


def _avatar_preview(self, obj):
    """头像预览：有图显示圆形缩略图，无图显示占位文字。

    挂到 ModelAdmin/Inline 类上后以 bound method 调用（self=管理类实例），
    签名必须是 (self, obj)，否则 admin 列表/只读字段渲染报 TypeError。
    """
    if obj and obj.avatar:
        return mark_safe(f'<img src="{obj.avatar.url}" height="44" style="border-radius:50%;object-fit:cover">')
    return "未上传"


_avatar_preview.short_description = "头像预览"


class UserProfileInline(admin.TabularInline):
    """用户编辑页内联头像/签名（后台可查看/编辑每个用户的资料）。"""
    model = UserProfile
    extra = 0
    fields = ("avatar_preview", "avatar", "bio", "muted_until", "is_muted_forever")
    readonly_fields = ("avatar_preview",)
    avatar_preview = _avatar_preview  # 模块级函数挂到类上，admin 才能识别


admin.site.unregister(User)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    inlines = [UserProfileInline]
    list_display = ("username", "email", "mute_status", "is_active", "is_staff", "date_joined", "last_login")
    list_filter = ("is_active", "is_staff")
    actions = ["mute_1h", "mute_24h", "mute_7d", "mute_forever", "unmute", "ban", "unban"]

    def mute_status(self, obj):
        """禁言状态徽标：永久 / 限时（含截止时间）/ 正常。"""
        profile = getattr(obj, "profile", None)
        if not profile or not profile.is_muted:
            return "正常"
        if profile.is_muted_forever:
            return mark_safe('<span style="color:#d33">永久禁言</span>')
        local = timezone.localtime(profile.muted_until)
        return mark_safe(f'<span style="color:#d93">禁言至 {local:%m-%d %H:%M}</span>')

    mute_status.short_description = "禁言状态"

    def _mute(self, request, queryset, until):
        from datetime import timedelta

        for user in queryset:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if until is None:
                profile.is_muted_forever = True
                profile.muted_until = None
            else:
                profile.is_muted_forever = False
                profile.muted_until = timezone.now() + timedelta(seconds=until)
            profile.save(update_fields=["is_muted_forever", "muted_until"])

    @admin.action(description="禁言 1 小时")
    def mute_1h(self, request, queryset):
        self._mute(request, queryset, 3600)

    @admin.action(description="禁言 24 小时")
    def mute_24h(self, request, queryset):
        self._mute(request, queryset, 86400)

    @admin.action(description="禁言 7 天")
    def mute_7d(self, request, queryset):
        self._mute(request, queryset, 7 * 86400)

    @admin.action(description="永久禁言")
    def mute_forever(self, request, queryset):
        self._mute(request, queryset, None)

    @admin.action(description="解除禁言")
    def unmute(self, request, queryset):
        UserProfile.objects.filter(user__in=queryset).update(
            is_muted_forever=False, muted_until=None
        )

    @admin.action(description="封禁（禁止登录，数据保留）")
    def ban(self, request, queryset):
        queryset.exclude(is_superuser=True).update(is_active=False)

    @admin.action(description="解封")
    def unban(self, request, queryset):
        queryset.update(is_active=True)


@admin.register(RateLimitHit)
class RateLimitHitAdmin(admin.ModelAdmin):
    """限频命中记录（只读排查用，可批量清理）。"""
    list_display = ("ip", "action", "created_at")
    list_filter = ("action",)
    search_fields = ("ip",)
    actions = ["clear_old"]

    @admin.action(description="清理 48 小时前的记录")
    def clear_old(self, request, queryset):
        from datetime import timedelta

        n, _ = RateLimitHit.objects.filter(created_at__lt=timezone.now() - timedelta(hours=48)).delete()
        self.message_user(request, f"已清理 {n} 条过期记录")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "avatar_preview", "bio", "mute_until_display")
    search_fields = ("user__username",)
    readonly_fields = ("avatar_preview",)
    avatar_preview = _avatar_preview

    def mute_until_display(self, obj):
        if obj.is_muted_forever:
            return "永久禁言"
        if obj.muted_until:
            return timezone.localtime(obj.muted_until).strftime("%Y-%m-%d %H:%M")
        return "—"

    mute_until_display.short_description = "禁言至"
