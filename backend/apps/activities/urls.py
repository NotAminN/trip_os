from django.urls import path

from .views import ActivityDetailView, TripActivityListCreateView

urlpatterns = [
    path(
        "trips/<int:trip_pk>/activities/",
        TripActivityListCreateView.as_view(),
        name="trip-activities",
    ),
    path("activities/<int:pk>/", ActivityDetailView.as_view(), name="activity-detail"),
]
