from django.urls import path

from .views import PlaceDetailView, TripPlaceListCreateView

urlpatterns = [
    path("trips/<int:trip_pk>/places/", TripPlaceListCreateView.as_view(), name="trip-places"),
    path("places/<int:pk>/", PlaceDetailView.as_view(), name="place-detail"),
]
