from django.contrib import admin

from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("__str__", "trip", "day", "place", "created_by", "created_at")
    search_fields = ("title", "content", "trip__title")
    autocomplete_fields = ("trip", "day", "place", "created_by")
