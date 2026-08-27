from apps.activities.tests.helpers import make_trip, register
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.trips.models import TripMember

User = get_user_model()


class AnalyticsTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner_client = cls.client_class()
        owner_data = register(cls.owner_client, "anowner@example.com", "anowner")
        cls.owner = User.objects.get(pk=owner_data["user"]["id"])

        cls.trip = make_trip(cls.owner, start="2026-09-20", end="2026-09-22")  # 3 days
        cls.url = f"/api/trips/{cls.trip.pk}/analytics/"

    def _seed(self):
        days = list(self.trip.days.order_by("day_number"))
        places = []
        for index, day in enumerate(days):
            for p in range(index + 1):  # day1:1, day2:2, day3:3 items
                response = self.owner_client.post(
                    f"/api/trips/{self.trip.pk}/places/",
                    {"name": f"P{day.pk}-{p}", "day": day.pk},
                    format="json",
                )
                places.append(response.data)
        activities = []
        for index in range(4):
            response = self.owner_client.post(
                f"/api/trips/{self.trip.pk}/activities/",
                {"title": f"A{index}", "day": days[index % 3].pk},
                format="json",
            )
            activities.append(response.data)
        # Complete 2 of 4.
        for activity in activities[:2]:
            self.owner_client.patch(
                f"/api/activities/{activity['id']}/", {"completed": True}, format="json"
            )
        # Expenses: 300 on day 1, 100 on day 3 -> most expensive day 1.
        self.owner_client.post(
            f"/api/trips/{self.trip.pk}/expenses/",
            {"title": "big", "amount": 300000, "expense_date": "2026-09-20"},
            format="json",
        )
        self.owner_client.post(
            f"/api/trips/{self.trip.pk}/expenses/",
            {"title": "small", "amount": 100000, "expense_date": "2026-09-22"},
            format="json",
        )
        # Packing: 2 items, 1 packed.
        ids = [
            self.owner_client.post(
                f"/api/trips/{self.trip.pk}/packing/", {"name": n}, format="json"
            ).data["id"]
            for n in ("x", "y")
        ]
        self.owner_client.patch(f"/api/packing/{ids[0]}/", {"is_packed": True}, format="json")

    def test_analytics_calculations(self):
        self._seed()
        data = self.owner_client.get(self.url).data

        self.assertEqual(data["places_count"], 6)
        self.assertEqual(data["activities_count"], 4)
        self.assertEqual(data["completed_activities"], 2)
        self.assertEqual(data["completion_percentage"], 50.0)
        self.assertEqual(data["total_expenses"], 400000)
        self.assertEqual(data["average_daily_spending"], round(400000 / 3))
        self.assertEqual(data["packing_percentage"], 50)
        self.assertEqual(data["days_count"], 3)

        self.assertEqual(data["most_expensive_day"]["day_number"], 1)
        self.assertEqual(data["most_expensive_day"]["spent"], 300000)

        # Day 3 has 3 places + 1 activity = 4 items (max).
        self.assertEqual(data["most_active_day"]["day_number"], 3)
        self.assertEqual(data["most_active_day"]["items"], 4)

    def test_empty_trip_analytics_zero_safe(self):
        data = self.owner_client.get(self.url).data
        self.assertEqual(data["places_count"], 0)
        self.assertEqual(data["completion_percentage"], 0)
        self.assertIsNone(data["most_expensive_day"])
        self.assertIsNone(data["most_active_day"])
        self.assertEqual(data["average_daily_spending"], 0)

    def test_non_member_404_and_viewer_read_ok(self):
        stranger = self.client_class()
        register(stranger, "anghost@example.com", "anghost")
        self.assertEqual(stranger.get(self.url).status_code, status.HTTP_404_NOT_FOUND)

        viewer = self.client_class()
        vdata = register(viewer, "anviewer@example.com", "anviewer")
        TripMember.objects.create(
            trip=self.trip,
            user=User.objects.get(pk=vdata["user"]["id"]),
            role=TripMember.Role.VIEWER,
        )
        self.assertEqual(viewer.get(self.url).status_code, status.HTTP_200_OK)
