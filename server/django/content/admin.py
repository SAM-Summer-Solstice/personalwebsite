from django.contrib import admin
from markdownx.admin import MarkdownxModelAdmin
from .models import Post, Project, About, Attachment, Comment


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
    list_display = ("post", "author", "created_at", "is_approved")
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
