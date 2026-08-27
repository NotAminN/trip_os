from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Write access only for the object owner."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner = getattr(obj, "owner", None) or getattr(obj, "user", None)
        return owner is not None and owner == request.user
