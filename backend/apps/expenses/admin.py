from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "trip",
        "category",
        "amount",
        "currency",
        "expense_date",
        "created_by",
    )
    list_filter = ("category", "expense_date")
    search_fields = ("title", "description", "trip__title")
    date_hierarchy = "expense_date"
    autocomplete_fields = ("trip", "day", "created_by")
