from rest_framework import status
from rest_framework.test import APITestCase

from apps.destinations.models import Destination


class DestinationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        Destination.objects.create(
            name="Kapadokya",
            country="Turkey",
            best_season="Spring",
            estimated_daily_cost=2500000,
            recommended_days=3,
        )
        cls.list_url = "/api/destinations/"

    def test_public_list_without_auth(self):
        anonymous = self.client_class()
        response = anonymous.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        item = response.data["results"][0]
        self.assertEqual(item["name"], "Kapadokya")
        self.assertEqual(item["recommended_days"], 3)

    def test_public_detail(self):
        destination = Destination.objects.first()
        response = self.client_class().get(f"{self.list_url}{destination.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["country"], "Turkey")

    def test_search_filter(self):
        response = self.client_class().get(f"{self.list_url}?search=kapadokya")
        self.assertEqual(response.data["count"], 1)
