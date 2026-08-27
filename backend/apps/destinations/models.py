from django.db import models


class Destination(models.Model):
    """Public destination-discovery data (read-only for clients)."""

    name = models.CharField(max_length=200, unique=True)
    country = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="destinations/%Y/%m/", blank=True, null=True)
    best_season = models.CharField(max_length=100, blank=True)
    estimated_daily_cost = models.PositiveBigIntegerField(default=0)
    recommended_days = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return f"{self.name}, {self.country}"
