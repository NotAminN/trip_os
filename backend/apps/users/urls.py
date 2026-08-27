"""
URL routes for the users app.

`auth_urlpatterns`    -> mounted at /api/auth/
`profile_urlpatterns` -> mounted at /api/users/
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AvatarUploadView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
)

auth_urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="auth-me"),
]

profile_urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("me/avatar/", AvatarUploadView.as_view(), name="me-avatar"),
]

urlpatterns = auth_urlpatterns + profile_urlpatterns
