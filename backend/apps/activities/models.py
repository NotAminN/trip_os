from django.db import models

from apps.places.models import Place
from apps.trips.models import Trip, TripDay


class Activity(models.Model):
    """A scheduled task/plan inside a trip day, optionally tied to a place."""

    class Category(models.TextChoices):
        SIGHTSEEING = "sightseeing", "Sightseeing"
        FOOD = "food", "Food"
        TRANSPORT = "transport", "Transport"
        SHOPPING = "shopping", "Shopping"
        RELAXATION = "relaxation", "Relaxation"
        ADVENTURE = "adventure", "Adventure"
        CULTURE = "culture", "Culture"
        OTHER = "other", "Other"

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="activities")
    day = models.ForeignKey(
        TripDay, on_delete=models.SET_NULL, related_name="activities", null=True, blank=True
    )
    place = models.ForeignKey(
        Place, on_delete=models.SET_NULL, related_name="activities", null=True, blank=True
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    cost = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="IRR")
    completed = models.BooleanField(default=False, db_index=True)
    position = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("position", "id")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(start_time__isnull=True)
                | models.Q(end_time__isnull=True)
                | models.Q(end_time__gt=models.F("start_time")),
                name="activity_end_time_gt_start_time",
            ),
        ]
        indexes = [
            models.Index(fields=["trip", "day"]),
            models.Index(fields=["trip", "completed"]),
            models.Index(fields=["trip", "category"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} [{self.get_category_display()}]"
