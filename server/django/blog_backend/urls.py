"""blog_backend URL 配置。"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from content import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("content.urls")),
    # markdownx：后台富文本/实时预览与图片上传（必须位于 SPA catch-all 之前，否则被回退到 index.html）
    path("markdownx/", include("markdownx.urls")),
]

# 开发环境服务用户上传资源（/media/）
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA fallback：排除 admin/api/media/static 之外的路径回退到 React 前台
# 注意用 (?P<path>.*) 捕获剩余路径并传给 react_spa 视图，否则静态资源永远回退到 index.html
urlpatterns += [
    re_path(r"^(?!admin|api|media|static)(?P<path>.*)", views.react_spa, name="react_spa"),
]
