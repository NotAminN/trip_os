"""
Timeline ordering services.

Powers the frontend drag & drop: items move inside a day or across days,
positions persist transactionally.
"""

from django.db import transaction
from django.shortcuts import get_object_or_404

from ..models import TripDay


def _model_for(kind: str):
    from apps.activities.models import Activity
    from apps.places.models import Place

    return {"places": Place, "activities": Activity}[kind]


@transaction.atomic
def reorder_timeline(*, trip, day_id, items, kind="places"):
    """Apply batched position updates for one trip day.

    Every referenced item must belong to this trip; otherwise nothing is
    written (atomic rollback) and ValueError is raised.
    """
    model = _model_for(kind)
    day = get_object_or_404(TripDay, pk=day_id, trip=trip)

    ids = [item["id"] for item in items]
    found = {obj.pk: obj for obj in model.objects.filter(trip=trip, pk__in=ids)}
    missing = [item_id for item_id in ids if item_id not in found]
    if missing:
        raise ValueError(f"Items not found in this trip: {missing}")

    updates = []
    for item in items:
        obj = found[item["id"]]
        obj.day = day
        obj.position = item["position"]
        updates.append(obj)

    model.objects.bulk_update(updates, ["day", "position"])
    return day
