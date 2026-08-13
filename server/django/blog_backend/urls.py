"""blog_backend URL 配置。"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from markdownx.views import MarkdownifyView

from content import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("content.urls")),
    # markdownx：上传用自定义视图（视频跳过 PIL 直接保存，见 content.views.markdownx_upload），
    # 预览保留默认实现。必须位于 SPA catch-all 之前，否则被回退到 index.html
    path("markdownx/upload/", views.markdownx_upload, name="markdownx_upload"),
    path("markdownx/markdownify/", MarkdownifyView.as_view(), name="markdownx_markdownify"),
]

# 开发环境服务用户上传资源（/media/）
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA fallback：排除 admin/api/media/static 之外的路径回退到 React 前台
# 注意用 (?P<path>.*) 捕获剩余路径并传给 react_spa 视图，否则静态资源永远回退到 index.html
urlpatterns += [
    re_path(r"^(?!admin|api|media|static)(?P<path>.*)", views.react_spa, name="react_spa"),
]
