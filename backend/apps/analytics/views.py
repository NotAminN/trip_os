from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.trips.models import Trip

from .services.analytics_service import calculate_trip_analytics


class TripAnalyticsView(APIView):
    """GET /api/trips/{trip_id}/analytics/ — calculated statistics."""

    permission_classes = [IsAuthenticated]

    def get(self, request, trip_pk):
        trip = get_object_or_404(
            Trip.objects.for_user(request.user), pk=trip_pk
        )
        return Response(calculate_trip_analytics(trip))
