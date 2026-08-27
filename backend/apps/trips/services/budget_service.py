"""
Budget calculations. The backend is the authoritative source for money math —
the frontend only renders these numbers.
"""

from datetime import timedelta

from django.db.models import Sum

from ..models import Trip


def calculate_budget(trip: Trip) -> dict:
    """Aggregate spending for a trip from database data."""
    totals = (
        trip.expenses.values("category").annotate(total=Sum("amount")).order_by()
    )
    categories = {row["category"]: row["total"] for row in totals}
    spent = sum(categories.values())
    budget = trip.budget or 0

    percentage = round((spent / budget) * 100, 1) if budget > 0 else 0.0

    by_date = dict(
        trip.expenses.values_list("expense_date").annotate(total=Sum("amount")).order_by()
    )
    daily_spending = []
    for index in range(trip.days_count):
        date = trip.start_date + timedelta(days=index)
        daily_spending.append(
            {
                "day_number": index + 1,
                "date": date.isoformat(),
                "spent": int(by_date.get(date, 0)),
            }
        )

    return {
        "budget": budget,
        "spent": spent,
        "remaining": budget - spent,
        "percentage": percentage,
        "currency": trip.currency,
        "categories": {key: int(value) for key, value in categories.items()},
        "daily_spending": daily_spending,
    }
