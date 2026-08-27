"""
Packing progress calculations.
"""

from django.db.models import Count, Q

from apps.trips.models import Trip

from ..models import PackingItem


def calculate_progress(trip: Trip) -> dict:
    """Dynamic packing stats: total/packed/remaining/percentage."""
    aggregate = PackingItem.objects.filter(trip=trip).aggregate(
        total=Count("id"),
        packed=Count("id", filter=Q(is_packed=True)),
    )
    total = aggregate["total"]
    packed = aggregate["packed"]
    remaining = total - packed
    percentage = round((packed / total) * 100) if total else 0

    return {
        "total": total,
        "packed": packed,
        "remaining": remaining,
        "percentage": percentage,
    }
