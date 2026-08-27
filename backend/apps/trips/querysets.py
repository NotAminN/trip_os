from django.db import models


class TripQuerySet(models.QuerySet):
    """Reusable query helpers for Trip (kept free of model imports)."""

    def for_user(self, user):
        """Only trips the user is a member of."""
        return self.filter(members__user=user)

    def with_role_annotation(self, user):
        """Annotate `my_role` = the requesting user's role in each trip."""
        membership = models.OuterRef("pk")
        # Lazy import to avoid a circular dependency with models.py.
        from .models import TripMember

        membership_qs = TripMember.objects.filter(
            trip=membership, user=user
        )
        return self.annotate(my_role=models.Subquery(membership_qs.values("role")[:1]))

    def with_common_related(self):
        return self.select_related("owner").prefetch_related("days")

    def exclude_archived(self):
        return self.exclude(status="archived")
