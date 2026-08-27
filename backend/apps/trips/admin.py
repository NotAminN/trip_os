from django.contrib import admin

from .models import Trip, TripDay, TripMember


class TripMemberInline(admin.TabularInline):
    model = TripMember
    extra = 0
    autocomplete_fields = ("user",)


class TripDayInline(admin.TabularInline):
    model = TripDay
    extra = 0
    fields = ("day_number", "date", "title")
    readonly_fields = ("day_number", "date")


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "destination",
        "country",
        "owner",
        "status",
        "start_date",
        "end_date",
        "budget",
        "currency",
    )
    list_filter = ("status", "country", "start_date")
    search_fields = ("title", "destination", "country", "owner__email", "owner__username")
    readonly_fields = ("created_at", "updated_at")
    inlines = [TripMemberInline, TripDayInline]
    date_hierarchy = "start_date"


@admin.register(TripDay)
class TripDayAdmin(admin.ModelAdmin):
    list_display = ("trip", "day_number", "date", "title")
    list_filter = ("trip__status",)
    search_fields = ("trip__title", "title")
