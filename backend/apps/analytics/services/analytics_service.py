"""
Trip analytics — every value is calculated from database rows here.
The frontend renders these numbers; it never re-implements them.
"""

from django.db.models import Count, Sum

from apps.packing.services.packing_service import calculate_progress
from apps.trips.services import budget_service


def _counts_by_day_number(queryset) -> dict:
    rows = queryset.values("day__day_number").annotate(items=Count("id"))
    return {
        row["day__day_number"]: row["items"]
        for row in rows
        if row["day__day_number"] is not None
    }


def calculate_trip_analytics(trip) -> dict:
    places = trip.places.all()
    activities = trip.activities.all()

    places_count = places.count()
    activities_count = activities.count()
    completed_activities = activities.filter(completed=True).count()
    completion_percentage = (
        round((completed_activities / activities_count) * 100, 1)
        if activities_count
        else 0
    )

    total_expenses = trip.expenses.aggregate(total=Sum("amount"))["total"] or 0
    days_count = trip.days_count
    average_daily_spending = (
        round(total_expenses / days_count) if days_count else 0
    )

    packing_percentage = calculate_progress(trip)["percentage"]

    # Most expensive day (from the budget service's daily breakdown).
    daily_spending = budget_service.calculate_budget(trip)["daily_spending"]
    most_expensive_day = None
    if daily_spending:
        candidate = max(daily_spending, key=lambda entry: entry["spent"])
        if candidate["spent"] > 0:
            most_expensive_day = candidate

    # Most active day = most scheduled items (places + activities).
    place_counts = _counts_by_day_number(places)
    activity_counts = _counts_by_day_number(activities)
    most_active_day = None
    best_number, best_total = None, 0
    for day_number in range(1, days_count + 1):
        total_items = place_counts.get(day_number, 0) + activity_counts.get(day_number, 0)
        if total_items > best_total:
            best_number, best_total = day_number, total_items
    if best_number is not None:
        day_row = trip.days.filter(day_number=best_number).only("date").first()
        most_active_day = {
            "day_number": best_number,
            "date": day_row.date.isoformat() if day_row else None,
            "items": best_total,
        }

    return {
        "places_count": places_count,
        "activities_count": activities_count,
        "completed_activities": completed_activities,
        "completion_percentage": completion_percentage,
        "total_expenses": int(total_expenses),
        "average_daily_spending": average_daily_spending,
        "packing_percentage": packing_percentage,
        "days_count": days_count,
        "most_expensive_day": most_expensive_day,
        "most_active_day": most_active_day,
    }
