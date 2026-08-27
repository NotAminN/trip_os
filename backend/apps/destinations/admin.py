from django.contrib import admin

from .models import Destination


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "country",
        "best_season",
        "estimated_daily_cost",
        "recommended_days",
    )
    search_fields = ("name", "country")
    list_filter = ("country",)
