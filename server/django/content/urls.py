from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path("posts/", views.posts_list),
    path("posts/<str:pk>/", views.post_detail),
    path("projects/", views.projects_list),
    path("about/", views.about_detail),
    path("users/", views.users_list),
    path("views/<str:pk>/", views.increment_views),
    # 用户认证（JWT）
    path("register/", views.register),
    path("token/", TokenObtainPairView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("me/", views.me),
    # 评论与点赞
    path("posts/<str:pk>/comments/", views.comments),
    path("comments/<int:pk>/", views.comment_detail),
    path("posts/<str:pk>/like/", views.toggle_like),
    # 通知（站内 + 已读）
    path("notifications/", views.notifications),
    path("notifications/read/", views.notifications_read_all),
    path("notifications/<int:pk>/read/", views.notification_read),
    # 密码重置
    path("password-reset/request/", views.password_reset_request),
    path("password-reset/confirm/", views.password_reset_confirm),
    # 附件上传/下载
    path("posts/<str:pk>/attachments/", views.upload_attachment),
    path("attachments/<int:pk>/download/", views.download_attachment),
]
