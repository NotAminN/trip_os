from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from apps.trips.models import Trip
from apps.trips.permissions import require_writer

from .models import Expense
from .serializers import ExpenseSerializer


class TripExpenseListCreateView(generics.ListCreateAPIView):
    """GET /api/trips/{trip_id}/expenses/  ·  POST same URL (writer roles)."""

    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category"]
    ordering_fields = ["expense_date", "created_at", "amount"]

    def get_trip(self) -> Trip:
        return get_object_or_404(
            Trip.objects.for_user(self.request.user), pk=self.kwargs["trip_pk"]
        )

    def get_queryset(self):
        return (
            Expense.objects.filter(trip=self.get_trip())
            .select_related("day", "created_by")
            .order_by("-expense_date", "-created_at")
        )

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        day_number = self.request.query_params.get("day")
        if day_number is not None:
            queryset = queryset.filter(day__day_number=day_number)
        return queryset

    def perform_create(self, serializer):
        trip = self.get_trip()
        require_writer(self.request.user, trip)

        day = serializer.validated_data.get("day")
        if day is not None and day.trip_id != trip.pk:
            raise ValidationError({"day": "Day does not belong to this trip."})

        expense_date = serializer.validated_data.get("expense_date")
        if expense_date is None:
            expense_date = day.date if day is not None else trip.start_date

        serializer.save(
            trip=trip,
            created_by=self.request.user,
            expense_date=expense_date,
        )


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/expenses/{id}/ — scoped to user's memberships."""

    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(trip__members__user=self.request.user)

    def perform_update(self, serializer):
        expense = self.get_object()
        require_writer(self.request.user, expense.trip)

        new_day = serializer.validated_data.get("day", expense.day)
        if new_day is not None and new_day.trip_id != expense.trip_id:
            raise ValidationError({"day": "Day does not belong to this trip."})
        serializer.save()

    def perform_destroy(self, instance):
        require_writer(self.request.user, instance.trip)
        instance.delete()
