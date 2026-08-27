from django.urls import path

from .views import (
    PackingDetailView,
    PackingProgressView,
    TripPackingListCreateView,
)

urlpatterns = [
    path(
        "trips/<int:trip_pk>/packing/",
        TripPackingListCreateView.as_view(),
        name="trip-packing",
    ),
    path(
        "trips/<int:trip_pk>/packing/progress/",
        PackingProgressView.as_view(),
        name="trip-packing-progress",
    ),
    path("packing/<int:pk>/", PackingDetailView.as_view(), name="packing-detail"),
]
