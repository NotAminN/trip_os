from django.contrib import admin

from .models import Place


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "trip",
        "day",
        "category",
        "estimated_cost",
        "currency",
        "position",
        "start_time",
    )
    list_filter = ("category", "trip__status")
    search_fields = ("name", "address", "trip__title")
    autocomplete_fields = ("trip", "day")
    ordering = ("trip", "position")
