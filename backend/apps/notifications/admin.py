from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "trip", "type", "is_read", "created_at")
    list_filter = ("type", "is_read")
    search_fields = ("title", "message", "user__email")
    autocomplete_fields = ("user", "trip")
    readonly_fields = ("created_at",)
