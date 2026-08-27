from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.trips.models import Trip

from .serializers import WeatherForecastSerializer
from .services.weather_service import get_forecast


class TripWeatherListView(generics.ListAPIView):
    """GET /api/trips/{trip_id}/weather/ — read-only forecast list."""

    serializer_class = WeatherForecastSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        # 404 for non-members via membership-scoped trip lookup.
        trip = get_object_or_404(Trip.objects.for_user(self.request.user), pk=self.kwargs["trip_pk"])
        return get_forecast(trip)
