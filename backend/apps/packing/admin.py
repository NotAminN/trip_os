from django.contrib import admin

from .models import PackingItem


@admin.register(PackingItem)
class PackingItemAdmin(admin.ModelAdmin):
    list_display = ("name", "trip", "category", "quantity", "is_packed")
    list_filter = ("category", "is_packed")
    search_fields = ("name", "trip__title")
    autocomplete_fields = ("trip",)
