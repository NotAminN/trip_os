"""
Trip business logic. Views/serializers stay thin; rules live here.
All multi-step mutations run inside a database transaction.
"""

from datetime import timedelta

from django.db import transaction

from ..models import Trip, TripDay, TripMember


def generate_missing_days(trip: Trip) -> list[TripDay]:
    """Create TripDay rows for day numbers that do not exist yet."""
    target = trip.days_count
    existing = set(trip.days.values_list("day_number", flat=True))
    missing = [
        TripDay(
            trip=trip,
            day_number=number,
            date=trip.start_date + timedelta(days=number - 1),
        )
        for number in range(1, target + 1)
        if number not in existing
    ]
    return list(TripDay.objects.bulk_create(missing)) if missing else []


def _refresh_retained_day_dates(trip: Trip) -> None:
    """Keep each retained day's `date` consistent with its `day_number`."""
    days = list(trip.days.filter(day_number__lte=trip.days_count))
    if not days:
        return
    for day in days:
        day.date = trip.start_date + timedelta(days=day.day_number - 1)
    TripDay.objects.bulk_update(days, ["date"])


def sync_trip_days(trip: Trip) -> list[TripDay]:
    """Align stored days with the trip's date range.

    Preserves existing day content; trims days beyond the new range and
    appends missing ones (e.g. after extending a trip).
    """
    with transaction.atomic():
        trip.days.filter(day_number__gt=trip.days_count).delete()
        _refresh_retained_day_dates(trip)
        return generate_missing_days(trip)


@transaction.atomic
def create_trip(*, owner, **validated_data) -> Trip:
    """Create a trip, register its owner as a member, and build its days."""
    trip = Trip.objects.create(owner=owner, **validated_data)
    TripMember.objects.create(
        trip=trip, user=owner, role=TripMember.Role.OWNER
    )
    sync_trip_days(trip)
    return trip


@transaction.atomic
def update_trip(trip: Trip, **updates) -> Trip:
    """Apply field updates and resync generated days when dates change."""
    date_fields_changed = bool({"start_date", "end_date"} & set(updates))

    for field, value in updates.items():
        setattr(trip, field, value)
    trip.save()

    if date_fields_changed:
        sync_trip_days(trip)
    return trip


@transaction.atomic
def add_member(trip: Trip, user, role: str) -> TripMember:
    membership, created = TripMember.objects.get_or_create(
        trip=trip,
        user=user,
        defaults={"role": role},
    )
    if not created:
        raise ValueError("User is already a member of this trip.")
    return membership


@transaction.atomic
def remove_member(trip: Trip, user) -> None:
    deleted, _ = TripMember.objects.filter(trip=trip, user=user).exclude(
        role=TripMember.Role.OWNER
    ).delete()
    if not deleted:
        raise ValueError("Membership not found or cannot be removed.")


def get_user_role(user, trip: Trip) -> str | None:
    """Return the user's role in the trip, or None when not a member."""
    if not getattr(user, "is_authenticated", False):
        return None
    membership = (
        TripMember.objects.filter(trip=trip, user=user).only("role").first()
    )
    return membership.role if membership else None
