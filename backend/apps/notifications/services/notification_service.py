"""
Notification creation service — used by other apps and seed commands.
"""

from django.db import transaction

from ..models import Notification


@transaction.atomic
def notify(user, *, type_, title, message="", trip=None):
    """Create one notification for a user. Returns the Notification row."""
    return Notification.objects.create(
        user=user,
        trip=trip,
        type=type_,
        title=title,
        message=message,
    )


@transaction.atomic
def mark_all_read(user) -> int:
    """Mark every unread notification of the user as read."""
    return Notification.objects.filter(user=user, is_read=False).update(is_read=True)
