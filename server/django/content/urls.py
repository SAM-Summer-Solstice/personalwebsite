from django.urls import path
from . import views

urlpatterns = [
    path("posts/", views.posts_list),
    path("posts/<str:pk>/", views.post_detail),
    path("projects/", views.projects_list),
    path("about/", views.about_detail),
    path("views/<str:pk>/", views.increment_views),
]
