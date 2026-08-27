from django.urls import path

from .views import TripAnalyticsView

urlpatterns = [
    path(
        "trips/<int:trip_pk>/analytics/",
        TripAnalyticsView.as_view(),
        name="trip-analytics",
    ),
]
