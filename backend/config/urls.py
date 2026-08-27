"""
Root URL configuration for Trip OS API.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.trips.views import DashboardView
from apps.users import urls as users_urls
from common.views import HealthView

api_urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("auth/", include(users_urls.auth_urlpatterns)),
    path("users/", include(users_urls.profile_urlpatterns)),
    path("", include("apps.trips.urls")),
    path("", include("apps.places.urls")),
    path("", include("apps.activities.urls")),
    path("", include("apps.expenses.urls")),
    path("", include("apps.packing.urls")),
    path("", include("apps.notes.urls")),
    path("", include("apps.weather.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.analytics.urls")),
    path("", include("apps.destinations.urls")),
    path("", include("apps.search.urls")),
    path("schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="api-schema"), name="api-docs"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_urlpatterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
