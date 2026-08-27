from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.trips.models import Trip
from apps.trips.permissions import require_writer

from .models import PackingItem
from .serializers import PackingItemSerializer
from .services.packing_service import calculate_progress


class TripPackingListCreateView(generics.ListCreateAPIView):
    """GET /api/trips/{trip_id}/packing/  ·  POST same URL (writer roles)."""

    serializer_class = PackingItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category", "is_packed"]

    def get_trip(self) -> Trip:
        return get_object_or_404(
            Trip.objects.for_user(self.request.user), pk=self.kwargs["trip_pk"]
        )

    def get_queryset(self):
        return PackingItem.objects.filter(trip=self.get_trip())

    def perform_create(self, serializer):
        trip = self.get_trip()
        require_writer(self.request.user, trip)
        serializer.save(trip=trip)


class PackingProgressView(APIView):
    """GET /api/trips/{trip_id}/packing/progress/ — dynamic stats."""

    permission_classes = [IsAuthenticated]

    def get(self, request, trip_pk):
        trip = get_object_or_404(
            Trip.objects.for_user(request.user), pk=trip_pk
        )
        return Response(calculate_progress(trip))


class PackingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/packing/{id}/ — scoped to user's memberships."""

    serializer_class = PackingItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PackingItem.objects.filter(trip__members__user=self.request.user)

    def perform_update(self, serializer):
        item = self.get_object()
        require_writer(self.request.user, item.trip)
        serializer.save()

    def perform_destroy(self, instance):
        require_writer(self.request.user, instance.trip)
        instance.delete()
