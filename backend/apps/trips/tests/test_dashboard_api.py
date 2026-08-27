import datetime

from apps.activities.tests.helpers import make_trip, register
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.services.notification_service import notify
from apps.trips.models import Trip

User = get_user_model()


class DashboardTests(APITestCase):
    def setUp(self):
        self.client_obj = self.client_class()
        data = register(self.client_obj, "dash@example.com", "dash")
        self.user = User.objects.get(pk=data["user"]["id"])
        self.url = "/api/dashboard/"

    def _create_upcoming_trip(self, start_offset, end_offset):
        today = timezone.localdate()
        return make_trip(
            self.user,
            start=(today + datetime.timedelta(days=start_offset)).isoformat(),
            end=(today + datetime.timedelta(days=end_offset)).isoformat(),
        )

    def test_dashboard_requires_auth(self):
        self.assertEqual(
            self.client_class().get(self.url).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_empty_dashboard_shape(self):
        data = self.client_obj.get(self.url).data
        self.assertEqual(data["trips"]["total"], 0)
        self.assertIsNone(data["next_trip"])
        self.assertEqual(data["upcoming_activities"], [])
        self.assertEqual(data["packing_summary"]["percentage"], 0)

    def test_aggregated_dashboard(self):
        trip = self._create_upcoming_trip(start_offset=3, end_offset=6)
        day_one = trip.days.get(day_number=1)

        # Activity scheduled for the trip's first day.
        self.client_obj.post(
            f"/api/trips/{trip.pk}/activities/",
            {"title": "گشت صبح", "day": day_one.pk, "start_time": "09:00"},
            format="json",
        )
        self.client_obj.post(
            f"/api/trips/{trip.pk}/expenses/",
            {"title": "هتل", "amount": 800000},
            format="json",
        )
        item = self.client_obj.post(
            f"/api/trips/{trip.pk}/packing/",
            {"name": "پاسپورت", "category": "documents"},
            format="json",
        ).data
        self.client_obj.patch(
            f"/api/packing/{item['id']}/", {"is_packed": True}, format="json"
        )
        notify(
            self.user,
            type_="trip",
            title="سفر نزدیک است!",
            message="۳ روز مانده",
            trip=trip,
        )

        # Archived trip must be excluded from money/packing summaries.
        archived = self._create_upcoming_trip(start_offset=-30, end_offset=-25)
        archived.status = Trip.Status.ARCHIVED
        archived.save()
        self.client_obj.post(
            f"/api/trips/{archived.pk}/expenses/",
            {"title": "قدیمی", "amount": 999999},
            format="json",
        )

        data = self.client_obj.get(self.url).data

        self.assertEqual(data["trips"]["total"], 2)
        self.assertEqual(data["trips"]["status_counts"].get("planning"), 1)
        self.assertEqual(data["trips"]["status_counts"].get("archived"), 1)

        self.assertIsNotNone(data["next_trip"])
        self.assertEqual(data["next_trip"]["id"], trip.pk)
        self.assertEqual(data["next_trip"]["days_left"], 3)

        self.assertEqual(len(data["upcoming_activities"]), 1)
        upcoming = data["upcoming_activities"][0]
        self.assertEqual(upcoming["title"], "گشت صبح")
        self.assertEqual(upcoming["date"], day_one.date.isoformat())

        self.assertEqual(data["budget_summary"]["budget"], 1000)  # archived excluded
        self.assertEqual(data["budget_summary"]["spent"], 800000)
        self.assertEqual(data["budget_summary"]["remaining"], 1000 - 800000)

        self.assertEqual(data["packing_summary"], {"total": 1, "packed": 1, "remaining": 0, "percentage": 100})
        self.assertEqual(data["unread_notifications"], 1)
