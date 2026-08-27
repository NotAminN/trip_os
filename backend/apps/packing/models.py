from django.db import models

from apps.trips.models import Trip


class PackingItem(models.Model):
    """One checklist entry for a trip."""

    class Category(models.TextChoices):
        CLOTHING = "clothing", "Clothing"
        DOCUMENTS = "documents", "Documents"
        ELECTRONICS = "electronics", "Electronics"
        PERSONAL = "personal", "Personal"
        HEALTH = "health", "Health"
        TRAVEL = "travel", "Travel"
        OTHER = "other", "Other"

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="packing_items")
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    is_packed = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("category", "created_at")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1), name="packing_quantity_gte_one"
            ),
        ]
        indexes = [
            models.Index(fields=["trip", "is_packed"]),
            models.Index(fields=["trip", "category"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ×{self.quantity}"
