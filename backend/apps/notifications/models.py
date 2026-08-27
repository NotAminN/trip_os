from django.conf import settings
from django.db import models

from apps.trips.models import Trip


class Notification(models.Model):
    """A user-scoped message; users only ever see their own rows."""

    class Type(models.TextChoices):
        DEADLINE = "deadline", "Deadline"
        BUDGET = "budget", "Budget"
        PACKING = "packing", "Packing"
        ACTIVITY = "activity", "Activity"
        TRIP = "trip", "Trip"
        SYSTEM = "system", "System"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    trip = models.ForeignKey(
        Trip, on_delete=models.SET_NULL, related_name="notifications", null=True, blank=True
    )
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.SYSTEM)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "is_read"]),
        ]

    def __str__(self) -> str:
        return f"[{self.type}] {self.title}"

    def mark_read(self) -> None:
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=["is_read"])
