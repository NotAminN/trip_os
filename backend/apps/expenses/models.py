from django.conf import settings
from django.db import models

from apps.trips.models import Trip, TripDay


class Expense(models.Model):
    """A single money-spent record inside a trip."""

    class Category(models.TextChoices):
        ACCOMMODATION = "accommodation", "Accommodation"
        FOOD = "food", "Food"
        TRANSPORT = "transport", "Transport"
        ACTIVITIES = "activities", "Activities"
        SHOPPING = "shopping", "Shopping"
        TICKETS = "tickets", "Tickets"
        OTHER = "other", "Other"

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="expenses")
    day = models.ForeignKey(
        TripDay, on_delete=models.SET_NULL, related_name="expenses", null=True, blank=True
    )
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    title = models.CharField(max_length=200)
    amount = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3, default="IRR")
    description = models.TextField(blank=True)
    expense_date = models.DateField(db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="expenses",
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-expense_date", "-created_at")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0), name="expense_amount_positive"
            ),
        ]
        indexes = [
            models.Index(fields=["trip", "category"]),
            models.Index(fields=["trip", "expense_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.title}: {self.amount} {self.currency}"
