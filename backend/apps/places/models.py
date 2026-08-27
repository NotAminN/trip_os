from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.trips.models import Trip, TripDay


class Place(models.Model):
    """A point of interest scheduled (or not) inside a trip."""

    class Category(models.TextChoices):
        ATTRACTION = "attraction", "Attraction"
        RESTAURANT = "restaurant", "Restaurant"
        CAFE = "cafe", "Cafe"
        MUSEUM = "museum", "Museum"
        HOTEL = "hotel", "Hotel"
        SHOPPING = "shopping", "Shopping"
        NATURE = "nature", "Nature"
        ACTIVITY = "activity", "Activity"
        AIRPORT = "airport", "Airport"
        TRANSPORT = "transport", "Transport"
        OTHER = "other", "Other"

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="places")
    day = models.ForeignKey(
        TripDay, on_delete=models.SET_NULL, related_name="places", null=True, blank=True
    )
    name = models.CharField(max_length=200)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    description = models.TextField(blank=True)
    address = models.CharField(max_length=300, blank=True)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )
    image = models.ImageField(upload_to="places/%Y/%m/", blank=True, null=True)
    estimated_cost = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="IRR")
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
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
                name="place_end_time_gt_start_time",
            ),
        ]
        indexes = [
            models.Index(fields=["trip", "day"]),
            models.Index(fields=["trip", "category"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_category_display()})"
