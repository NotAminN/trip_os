from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from apps.trips.models import Trip
from apps.trips.permissions import require_writer

from .models import Note
from .serializers import NoteSerializer


class TripNoteListCreateView(generics.ListCreateAPIView):
    """GET /api/trips/{trip_id}/notes/  ·  POST same URL (writer roles).

    Optional scope: `day` (day_number) and/or `place` (place id) in the body.
    Without them the note belongs to the whole trip.
    """

    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]
    ordering_fields = ["created_at", "updated_at"]

    def get_trip(self) -> Trip:
        return get_object_or_404(
            Trip.objects.for_user(self.request.user), pk=self.kwargs["trip_pk"]
        )

    def get_queryset(self):
        queryset = (
            Note.objects.filter(trip=self.get_trip())
            .select_related("day", "place", "created_by")
        )
        day_number = self.request.query_params.get("day")
        if day_number is not None:
            queryset = queryset.filter(day__day_number=day_number)
        place_id = self.request.query_params.get("place")
        if place_id is not None:
            queryset = queryset.filter(place_id=place_id)
        return queryset

    def perform_create(self, serializer):
        trip = self.get_trip()
        require_writer(self.request.user, trip)

        day = serializer.validated_data.get("day")
        if day is not None and day.trip_id != trip.pk:
            raise ValidationError({"day": "Day does not belong to this trip."})
        place = serializer.validated_data.get("place")
        if place is not None and place.trip_id != trip.pk:
            raise ValidationError({"place": "Place does not belong to this trip."})
        if place is not None and day is None and place.day_id:
            # Attach to the place's day automatically when unspecified.
            from apps.trips.models import TripDay

            day = TripDay.objects.filter(pk=place.day_id).first()

        serializer.save(trip=trip, created_by=self.request.user)


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/notes/{id}/ — scoped to user's memberships."""

    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(trip__members__user=self.request.user)

    def perform_update(self, serializer):
        note = self.get_object()
        require_writer(self.request.user, note.trip)

        new_day = serializer.validated_data.get("day", note.day)
        if new_day is not None and new_day.trip_id != note.trip_id:
            raise ValidationError({"day": "Day does not belong to this trip."})
        new_place = serializer.validated_data.get("place", note.place)
        if new_place is not None and new_place.trip_id != note.trip_id:
            raise ValidationError({"place": "Place does not belong to this trip."})
        serializer.save()

    def perform_destroy(self, instance):
        require_writer(self.request.user, instance.trip)
        instance.delete()
