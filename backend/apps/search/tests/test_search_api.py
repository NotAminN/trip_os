from apps.activities.tests.helpers import make_trip, register
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.destinations.models import Destination

User = get_user_model()


class SearchTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice_client = cls.client_class()
        alice_data = register(cls.alice_client, "sally@example.com", "sally")
        alice = User.objects.get(pk=alice_data["user"]["id"])
        cls.trip = make_trip(alice)
        cls.url = "/api/search/"

        cls.alice_client.post(
            f"/api/trips/{cls.trip.pk}/places/",
            {"name": "موزه فرش", "description": "جاذبه تاریخی"},
            format="json",
        )
        cls.alice_client.post(
            f"/api/trips/{cls.trip.pk}/activities/",
            {"title": "بازدید موزه"},
            format="json",
        )
        cls.alice_client.post(
            f"/api/trips/{cls.trip.pk}/notes/", {"content": "یادداشت درباره موزه"}
        , format="json")
        Destination.objects.create(
            name="Istanbul", country="Turkey", description="موزه‌های زیاد"
        )

    def test_search_requires_q(self):
        response = self.alice_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_grouped_results_across_resources(self):
        data = self.alice_client.get(f"{self.url}?q=موزه").data

        self.assertGreaterEqual(data["counts"]["places"], 1)
        self.assertGreaterEqual(data["counts"]["activities"], 1)
        self.assertGreaterEqual(data["counts"]["notes"], 1)
        self.assertGreaterEqual(data["counts"]["destinations"], 1)
        self.assertIn("trips", data)

    def test_search_scoped_to_memberships(self):
        stranger = self.client_class()
        register(stranger, "sguest@example.com", "sguest")
        data = stranger.get(f"{self.url}?q=موزه").data
        self.assertEqual(data["counts"]["places"], 0)
        self.assertEqual(data["counts"]["notes"], 0)
        # Public destinations still searchable.
        self.assertEqual(data["counts"]["destinations"], 1)

    def test_search_by_destination_finds_trip(self):
        data = self.alice_client.get(f"{self.url}?q=testland").data
        self.assertEqual(data["counts"]["trips"], 1)
