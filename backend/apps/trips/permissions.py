from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .services.trip_service import get_user_role
from .models import TripMember


def require_role(user, trip, *roles) -> str:
    """Raise PermissionDenied unless the user holds one of `roles` in trip."""
    role = get_user_role(user, trip)
    if role not in roles:
        raise PermissionDenied("You do not have permission for this action.")
    return role


def require_writer(user, trip) -> str:
    """Owner or editor required."""
    return require_role(user, trip, *TripMember.WRITE_ROLES)


class TripPermission(BasePermission):
    """
    Authoritative object-level authorization for trips.

    Read access: any trip member (owner / editor / viewer).
    Write access: owner and editor only.

    Non-members never reach object checks because view querysets are scoped
    to the requesting user's memberships — they get 404 instead of leaking
    the existence of other users' trips.
    """

    message = "You do not have permission to modify this trip."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        role = get_user_role(request.user, obj)
        if role is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        return role in TripMember.WRITE_ROLES


class IsTripOwner(BasePermission):
    """Only the trip owner may perform this action."""

    message = "Only the trip owner can perform this action."

    def has_object_permission(self, request, view, obj):
        return get_user_role(request.user, obj) == TripMember.Role.OWNER
