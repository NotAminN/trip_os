from django.urls import path

from .views import ExpenseDetailView, TripExpenseListCreateView

urlpatterns = [
    path(
        "trips/<int:trip_pk>/expenses/",
        TripExpenseListCreateView.as_view(),
        name="trip-expenses",
    ),
    path("expenses/<int:pk>/", ExpenseDetailView.as_view(), name="expense-detail"),
]
