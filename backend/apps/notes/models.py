from django.conf import settings
from django.db import models

from apps.places.models import Place
from apps.trips.models import Trip, TripDay


class Note(models.Model):
    """A free-form note attached to a trip, a day, or a place."""

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="notes")
    day = models.ForeignKey(
        TripDay, on_delete=models.SET_NULL, related_name="trip_notes", null=True, blank=True
    )
    place = models.ForeignKey(
        Place, on_delete=models.SET_NULL, related_name="trip_notes", null=True, blank=True
    )
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="notes",
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["trip", "day"]),
            models.Index(fields=["trip", "place"]),
        ]

    def __str__(self) -> str:
        return self.title or self.content[:50]
