from apps.activities.tests.helpers import make_trip, register
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.expenses.models import Expense

User = get_user_model()


class ExpenseBudgetTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner_client = cls.client_class()
        owner_data = register(cls.owner_client, "eowner@example.com", "eowner")
        cls.owner = User.objects.get(pk=owner_data["user"]["id"])

        cls.viewer_client = cls.client_class()
        viewer_data = register(cls.viewer_client, "eviewer@example.com", "eviewer")
        cls.viewer = User.objects.get(pk=viewer_data["user"]["id"])

    def _setup_trip(self, budget):
        from apps.trips.models import TripMember

        trip = make_trip(self.owner, start="2026-09-20", end="2026-09-22")
        trip.budget = budget
        trip.save()

        TripMember.objects.create(
            trip=trip, user=self.viewer, role=TripMember.Role.VIEWER
        )
        return trip

    def _add_expense(self, client, trip, title, amount, category="food", day_number=None):
        payload = {"title": title, "amount": amount, "category": category}
        if day_number:
            day = trip.days.get(day_number=day_number)
            payload["day"] = day.pk
        return client.post(f"/api/trips/{trip.pk}/expenses/", payload, format="json")

    def test_create_expense_defaults_and_created_by(self):
        trip = self._setup_trip(budget=1000000)
        response = self._add_expense(self.owner_client, trip, "هتل", 500000, "accommodation")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created_by"], self.owner.email)
        # expense_date defaulted from the trip start date.
        self.assertEqual(response.data["expense_date"], "2026-09-20")

    def test_amount_must_be_positive(self):
        trip = self._setup_trip(budget=1000000)
        for bad_amount in (0, -100):
            with self.subTest(amount=bad_amount):
                response = self._add_expense(self.owner_client, trip, "x", bad_amount)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_day_and_category_filters(self):
        trip = self._setup_trip(budget=1000000)
        self._add_expense(self.owner_client, trip, "day1 food", 100, "food", day_number=1)
        self._add_expense(self.owner_client, trip, "day2 taxi", 200, "transport", day_number=2)

        by_cat = self.owner_client.get(f"/api/trips/{trip.pk}/expenses/?category=transport").data
        self.assertEqual(by_cat["count"], 1)

        by_day = self.owner_client.get(f"/api/trips/{trip.pk}/expenses/?day=2").data
        self.assertEqual(by_day["count"], 1)
        self.assertEqual(by_day["results"][0]["title"], "day2 taxi")

    def test_budget_calculations_from_database(self):
        trip = self._setup_trip(budget=1000000)
        self._add_expense(self.owner_client, trip, "غذا ۱", 400000, "food")
        self._add_expense(self.owner_client, trip, "غذا ۲", 100000, "food")
        self._add_expense(self.owner_client, trip, "تاکسی", 200000, "transport")

        data = self.owner_client.get(f"/api/trips/{trip.pk}/budget/").data

        self.assertEqual(data["budget"], 1000000)
        self.assertEqual(data["spent"], 700000)
        self.assertEqual(data["remaining"], 300000)
        self.assertEqual(data["percentage"], 70.0)
        self.assertEqual(data["categories"]["food"], 500000)
        self.assertEqual(data["categories"]["transport"], 200000)
        self.assertEqual(len(data["daily_spending"]), 3)
        self.assertEqual(data["daily_spending"][0]["spent"], 700000)

    def test_budget_zero_budget_no_division_error(self):
        trip = self._setup_trip(budget=0)
        self._add_expense(self.owner_client, trip, "خرج", 50)

        data = self.owner_client.get(f"/api/trips/{trip.pk}/budget/").data
        self.assertEqual(data["percentage"], 0)
        self.assertEqual(data["remaining"], -50)  # overspent

    def test_detail_scoping_and_roles(self):
        trip = self._setup_trip(budget=1000000)
        created = self._add_expense(self.owner_client, trip, "بلیط", 90000).data
        url = f"/api/expenses/{created['id']}/"

        stranger = self.client_class()
        register(stranger, "eghost@example.com", "eghost")
        self.assertEqual(stranger.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.viewer_client.get(url).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.viewer_client.patch(url, {"amount": 1}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        deleted = self.owner_client.delete(url)
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
