from django.db.models import Max
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from apps.trips.models import Trip
from apps.trips.permissions import require_writer

from .models import Activity
from .serializers import ActivitySerializer


def _next_position(trip, day) -> int:
    current_max = Activity.objects.filter(trip=trip, day=day).aggregate(
        max_position=Max("position")
    )["max_position"]
    return (current_max + 1) if current_max is not None else 0


def _resolve_day_and_place(trip, requested_day, requested_place, default_day=True):
    if requested_day is not None and requested_day.trip_id != trip.pk:
        raise ValidationError({"day": "Day does not belong to this trip."})
    if requested_place is not None and requested_place.trip_id != trip.pk:
        raise ValidationError({"place": "Place does not belong to this trip."})
    day = requested_day
    if day is None and default_day:
        day = trip.days.order_by("day_number").first()
    return day, requested_place


class TripActivityListCreateView(generics.ListCreateAPIView):
    """GET /api/trips/{trip_id}/activities/  ·  POST same URL (writer roles)."""

    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category", "completed"]
    ordering_fields = ["position", "created_at"]

    def get_trip(self) -> Trip:
        return get_object_or_404(
            Trip.objects.for_user(self.request.user), pk=self.kwargs["trip_pk"]
        )

    def get_queryset(self):
        return (
            Activity.objects.filter(trip=self.get_trip())
            .select_related("day", "place")
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
        day, place = _resolve_day_and_place(
            trip,
            serializer.validated_data.get("day"),
            serializer.validated_data.get("place"),
        )
        serializer.save(
            trip=trip,
            day=day,
            place=place,
            position=_next_position(trip, day),
        )


class ActivityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/activities/{id}/ — scoped to user's memberships."""

    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Activity.objects.filter(trip__members__user=self.request.user)

    def perform_update(self, serializer):
        activity = self.get_object()
        require_writer(self.request.user, activity.trip)

        new_day = serializer.validated_data.get("day", activity.day)
        new_place = serializer.validated_data.get("place", activity.place)
        _resolve_day_and_place(activity.trip, new_day, new_place, default_day=False)

        moved_days = "day" in serializer.validated_data and (
            serializer.validated_data["day"] != activity.day
        )

        instance = serializer.save()

        if moved_days and "position" not in serializer.validated_data:
            instance.position = _next_position(activity.trip, instance.day)
            instance.save(update_fields=["position"])

    def perform_destroy(self, instance):
        require_writer(self.request.user, instance.trip)
        instance.delete()
