"""
Aggregated dashboard data — one request powers the frontend dashboard
instead of a dozen separate calls.
"""

from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone

from ..models import Trip

NOTIFICATION_LIMIT = 5
UPCOMING_LIMIT = 5


def get_dashboard(user) -> dict:
    today = timezone.localdate()

    trips = Trip.objects.for_user(user)
    status_counts = dict(
        trips.values("status").annotate(count=Count("id")).values_list("status", "count")
    )

    live_trips = trips.exclude(status=Trip.Status.ARCHIVED)

    # Next upcoming trip (by start date).
    next_trip = (
        live_trips.filter(start_date__gte=today)
        .with_role_annotation(user)
        .select_related("owner")
        .prefetch_related("days")
        .order_by("start_date")
        .first()
    )

    # Upcoming incomplete activities across all member trips.
    from apps.activities.models import Activity

    upcoming_rows = (
        Activity.objects.filter(trip__in=live_trips)
        .filter(completed=False, day__date__gte=today)
        .select_related("trip", "day", "place")
        .order_by("day__date", "start_time", "position")[:UPCOMING_LIMIT]
    )
    upcoming_activities = [
        {
            "id": row.pk,
            "title": row.title,
            "completed": row.completed,
            "start_time": row.start_time.isoformat() if row.start_time else None,
            "day_number": row.day.day_number if row.day else None,
            "date": row.day.date.isoformat() if row.day else None,
            "trip_id": row.trip_id,
            "trip_title": row.trip.title,
            "place": row.place.name if row.place_id else None,
        }
        for row in upcoming_rows
    ]

    # Money summary across live trips.
    from apps.expenses.models import Expense

    total_budget = live_trips.aggregate(total=Sum("budget"))["total"] or 0
    total_spent = Expense.objects.filter(trip__in=live_trips).aggregate(
        total=Sum("amount")
    )["total"] or 0

    # Packing summary across live trips.
    from apps.packing.models import PackingItem

    packing_agg = PackingItem.objects.filter(trip__in=live_trips).aggregate(
        total=Count("id"),
        packed=Count("id", filter=Q(is_packed=True)),
    )
    packing_total = packing_agg["total"]
    packing_packed = packing_agg["packed"]

    # Notifications.
    from apps.notifications.models import Notification

    unread_notifications = Notification.objects.filter(
        user=user, is_read=False
    ).count()

    dashboard = {
        "trips": {
            "total": trips.count(),
            "status_counts": status_counts,
        },
        "upcoming_activities": upcoming_activities,
        "budget_summary": {
            "budget": int(total_budget),
            "spent": int(total_spent),
            "remaining": int(total_budget - total_spent),
            "percentage": round((total_spent / total_budget) * 100, 1)
            if total_budget > 0
            else 0,
        },
        "packing_summary": {
            "total": packing_total,
            "packed": packing_packed,
            "remaining": packing_total - packing_packed,
            "percentage": round((packing_packed / packing_total) * 100)
            if packing_total
            else 0,
        },
        "unread_notifications": unread_notifications,
        "next_trip": None,
    }

    if next_trip is not None:
        days_left = (next_trip.start_date - today).days
        weather_preview = None
        from apps.weather.services.weather_service import get_forecast

        forecast_rows = list(get_forecast(next_trip)[:3])
        if forecast_rows:
            from apps.weather.serializers import WeatherForecastSerializer

            weather_preview = WeatherForecastSerializer(forecast_rows, many=True).data

        dashboard["next_trip"] = {
            "id": next_trip.pk,
            "title": next_trip.title,
            "destination": next_trip.destination,
            "country": next_trip.country,
            "cover_image": next_trip.cover_image.url if next_trip.cover_image else None,
            "start_date": next_trip.start_date.isoformat(),
            "end_date": next_trip.end_date.isoformat(),
            "days_count": next_trip.days_count,
            "my_role": getattr(next_trip, "my_role", None),
            "days_left": days_left,
            "weather_preview": weather_preview,
        }

    return dashboard
