from django.contrib import admin

from .models import Activity


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "trip",
        "day",
        "category",
        "completed",
        "cost",
        "currency",
        "position",
    )
    list_filter = ("category", "completed", "trip__status")
    search_fields = ("title", "description", "trip__title")
    autocomplete_fields = ("trip", "day", "place")
