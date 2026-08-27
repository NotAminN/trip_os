"""
Weather service.

Today: reads stored (mock/seed) forecasts.
Tomorrow: swap in a real provider here — the API contract stays identical:

    Frontend -> weatherService -> Django -> Weather Provider
"""

from ..models import WeatherForecast


def get_forecast(trip):
    """Return the stored forecast rows for a trip, ordered by date."""
    return (
        WeatherForecast.objects.filter(trip=trip)
        .select_related("day")
        .order_by("date")
    )
