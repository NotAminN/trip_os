from django.contrib import admin

from .models import WeatherForecast


@admin.register(WeatherForecast)
class WeatherForecastAdmin(admin.ModelAdmin):
    list_display = (
        "trip",
        "date",
        "condition",
        "temperature_high",
        "temperature_low",
        "humidity",
    )
    list_filter = ("condition",)
    autocomplete_fields = ("trip", "day")
