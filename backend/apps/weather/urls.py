from django.urls import path

from .views import TripWeatherListView

urlpatterns = [
    path(
        "trips/<int:trip_pk>/weather/",
        TripWeatherListView.as_view(),
        name="trip-weather",
    ),
]
