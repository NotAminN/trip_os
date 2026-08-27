from django.conf import settings
from django.db import models

from . import querysets


class Trip(models.Model):
    """A travel plan owned by one user and shared with optional members."""

    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trips",
    )
    title = models.CharField(max_length=200)
    destination = models.CharField(max_length=200)
    country = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(
        upload_to="trip_covers/%Y/%m/", blank=True, null=True
    )
    start_date = models.DateField()
    end_date = models.DateField()
    travelers_count = models.PositiveSmallIntegerField(default=1)
    budget = models.PositiveBigIntegerField(default=0)
    currency = models.CharField(max_length=3, default="IRR")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PLANNING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = querysets.TripQuerySet.as_manager()

    class Meta:
        verbose_name_plural = "trips"
        ordering = ("-created_at",)
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="trip_end_gte_start",
            ),
            models.CheckConstraint(
                condition=models.Q(budget__gte=0),
                name="trip_budget_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(travelers_count__gte=1),
                name="trip_travelers_gte_one",
            ),
        ]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["start_date"]),
            models.Index(fields=["owner"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.destination})"

    @property
    def days_count(self) -> int:
        return (self.end_date - self.start_date).days + 1


class TripMember(models.Model):
    """Membership of a user in a trip with an authorization role."""

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        EDITOR = "editor", "Editor"
        VIEWER = "viewer", "Viewer"

    ROLE_RANK = {
        Role.VIEWER: 1,
        Role.EDITOR: 2,
        Role.OWNER: 3,
    }

    WRITE_ROLES = (Role.OWNER, Role.EDITOR)

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trip_memberships",
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("trip", "user"), name="uniq_trip_member"),
        ]
        indexes = [
            models.Index(fields=["user"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} @ {self.trip}: {self.role}"

    @property
    def rank(self) -> int:
        return self.ROLE_RANK[self.role]


class TripDay(models.Model):
    """One calendar day of a trip's itinerary."""

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="days")
    day_number = models.PositiveIntegerField()
    date = models.DateField(db_index=True)
    title = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    weather_summary = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("day_number",)
        constraints = [
            models.UniqueConstraint(
                fields=("trip", "day_number"), name="uniq_trip_day_number"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.trip.title} — Day {self.day_number}"
