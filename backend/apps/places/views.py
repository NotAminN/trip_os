from django.db.models import Max
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from apps.trips.models import Trip, TripDay
from apps.trips.permissions import require_writer

from .models import Place
from .serializers import PlaceSerializer


def _next_position(trip, day) -> int:
    current_max = Place.objects.filter(trip=trip, day=day).aggregate(
        max_position=Max("position")
    )["max_position"]
    return (current_max + 1) if current_max is not None else 0


def _resolve_day(trip, requested_day, create_default=False):
    """Validate that a chosen day belongs to the trip; optionally default."""
    if requested_day is not None:
        if requested_day.trip_id != trip.pk:
            raise ValidationError({"day": "Day does not belong to this trip."})
        return requested_day
    if create_default:
        return trip.days.order_by("day_number").first()
    return None


class TripPlaceListCreateView(generics.ListCreateAPIView):
    """GET /api/trips/{trip_id}/places/  ·  POST same URL (writer roles)."""

    serializer_class = PlaceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category"]
    ordering_fields = ["position", "created_at"]

    def get_trip(self) -> Trip:
        # Non-members get 404 — trips are invisible to strangers.
        return get_object_or_404(
            Trip.objects.for_user(self.request.user), pk=self.kwargs["trip_pk"]
        )

    def get_queryset(self):
        return (
            Place.objects.filter(trip=self.get_trip())
            .select_related("day")
            .order_by("position", "id")
        )

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        day_number = self.request.query_params.get("day")
        if day_number is not None:
            queryset = queryset.filter(day__day_number=day_number)
        return queryset

    def perform_create(self, serializer):
        trip = self.get_trip()
        require_writer(self.request.user, trip)
        day = _resolve_day(
            trip,
            serializer.validated_data.get("day"),
            create_default=True,
        )
        serializer.save(
            trip=trip,
            day=day,
            position=_next_position(trip, day),
        )


class PlaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/places/{id}/ — scoped to user's memberships."""

    serializer_class = PlaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Place.objects.filter(trip__members__user=self.request.user)

    def perform_update(self, serializer):
        place = self.get_object()
        require_writer(self.request.user, place.trip)
        new_day = serializer.validated_data.get("day", place.day)
        if new_day is not None:
            if new_day.trip_id != place.trip_id:
                raise ValidationError({"day": "Day does not belong to this trip."})

        moved_days = "day" in serializer.validated_data and (
            serializer.validated_data["day"] != place.day
        )

        instance = serializer.save()

        if moved_days or "position" not in serializer.validated_data:
            if moved_days:
                instance.position = _next_position(place.trip, instance.day)
                instance.save(update_fields=["position"])

    def perform_destroy(self, instance):
        require_writer(self.request.user, instance.trip)
        instance.delete()
