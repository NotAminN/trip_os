"""
Global search across the authenticated user's data (+ public destinations).
Results are grouped by resource type and capped per group.
"""

from django.db.models import Q

from apps.activities.models import Activity
from apps.activities.serializers import ActivitySerializer
from apps.destinations.models import Destination
from apps.destinations.serializers import DestinationSerializer
from apps.notes.models import Note
from apps.notes.serializers import NoteSerializer
from apps.places.models import Place
from apps.places.serializers import PlaceSerializer
from apps.trips.models import Trip
from apps.trips.serializers import TripListSerializer

PER_GROUP_LIMIT = 10


def _member_trip_ids(user):
    return Trip.objects.for_user(user).values("pk")


def search(user, query: str) -> dict:
    pattern = query.strip()
    groups = {
        "trips": [],
        "places": [],
        "activities": [],
        "notes": [],
        "destinations": [],
    }
    if not pattern:
        return {"query": pattern, "counts": {k: 0 for k in groups}, **groups}

    trip_qs = (
        Trip.objects.for_user(user)
        .with_role_annotation(user)
        .filter(
            Q(title__icontains=pattern)
            | Q(destination__icontains=pattern)
            | Q(country__icontains=pattern)
            | Q(description__icontains=pattern)
        ).distinct()[:PER_GROUP_LIMIT]
    )
    place_qs = (
        Place.objects.filter(trip_id__in=_member_trip_ids(user))
        .filter(
            Q(name__icontains=pattern)
            | Q(address__icontains=pattern)
            | Q(description__icontains=pattern)
        )
        .select_related("day")[:PER_GROUP_LIMIT]
    )
    activity_qs = (
        Activity.objects.filter(trip_id__in=_member_trip_ids(user))
        .filter(Q(title__icontains=pattern) | Q(description__icontains=pattern))
        .select_related("day", "place")[:PER_GROUP_LIMIT]
    )
    note_qs = (
        Note.objects.filter(trip_id__in=_member_trip_ids(user))
        .filter(Q(title__icontains=pattern) | Q(content__icontains=pattern))
        .select_related("day", "place", "created_by")[:PER_GROUP_LIMIT]
    )
    destination_qs = Destination.objects.filter(
        Q(name__icontains=pattern)
        | Q(country__icontains=pattern)
        | Q(description__icontains=pattern)
    )[:PER_GROUP_LIMIT]

    context = {}
    groups["trips"] = TripListSerializer(trip_qs, many=True, context=context).data
    groups["places"] = PlaceSerializer(place_qs, many=True, context=context).data
    groups["activities"] = ActivitySerializer(activity_qs, many=True, context=context).data
    groups["notes"] = NoteSerializer(note_qs, many=True, context=context).data
    groups["destinations"] = DestinationSerializer(
        destination_qs, many=True, context=context
    ).data

    counts = {key: len(value) for key, value in groups.items()}
    return {"query": pattern, "counts": counts, **groups}
