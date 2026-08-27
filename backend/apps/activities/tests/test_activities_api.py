from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.activities.models import Activity
from apps.places.models import Place

from .helpers import make_trip, register  # noqa: F401 (re-exported helpers)

User = get_user_model()

PASSWORD = "S3cure-Passw0rd!"


class ActivityTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner_client = cls.client_class()
        owner_data = register(cls.owner_client, "aowner@example.com", "aowner")
        cls.owner = User.objects.get(pk=owner_data["user"]["id"])

        cls.viewer_client = cls.client_class()
        viewer_data = register(cls.viewer_client, "aviewer@example.com", "aviewer")
        cls.viewer = User.objects.get(pk=viewer_data["user"]["id"])

        from apps.trips.models import TripMember

        cls.trip = make_trip(cls.owner)
        TripMember.objects.create(trip=cls.trip, user=cls.viewer, role=TripMember.Role.VIEWER)

        cls.days = list(cls.trip.days.order_by("day_number"))
        cls.list_url = f"/api/trips/{cls.trip.pk}/activities/"

    def _create(self, **overrides):
        payload = {"title": "بازدید از موزه", "day": self.days[0].pk}
        payload.update(overrides)
        return self.owner_client.post(self.list_url, payload, format="json")

    def test_create_with_place_and_auto_position(self):
        place = self.owner_client.post(
            f"/api/trips/{self.trip.pk}/places/",
            {"name": "کافه", "category": "cafe", "day": self.days[0].pk},
            format="json",
        ).data

        first = self._create(place=place["id"])
        second = self._create(title="شام")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data["position"], 0)
        self.assertEqual(second.data["position"], 1)
        self.assertEqual(first.data["place"], place["id"])

    def test_place_from_other_trip_rejected(self):
        other_trip = make_trip(self.owner)
        foreign_place = self.owner_client.post(
            f"/api/trips/{other_trip.pk}/places/", {"name": "خارجی"}, format="json"
        ).data
        response = self._create(place=foreign_place["id"])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_completed_filter_and_toggle(self):
        a = self._create().data
        b = self._create(title="خرید سوغاتی").data

        self.assertEqual(
            self.owner_client.get(f"{self.list_url}?completed=true").data["count"], 0
        )

        self.owner_client.patch(f"/api/activities/{b['id']}/", {"completed": True}, format="json")

        done = self.owner_client.get(f"{self.list_url}?completed=true").data
        self.assertEqual(done["count"], 1)
        self.assertEqual(done["results"][0]["id"], b["id"])

        pending = self.owner_client.get(f"{self.list_url}?completed=false").data
        self.assertEqual([item["id"] for item in pending["results"]], [a["id"]])

    def test_day_number_filter(self):
        self._create(day=self.days[1].pk)
        response = self.owner_client.get(f"{self.list_url}?day=2").data
        self.assertEqual(response["count"], 1)

    def test_viewer_read_only(self):
        self._create()
        self.assertEqual(
            self.viewer_client.get(self.list_url).status_code, status.HTTP_200_OK
        )
        created = self.owner_client.get(self.list_url).data["results"][0]
        denied = self.viewer_client.patch(
            f"/api/activities/{created['id']}/", {"completed": True}, format="json"
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

    def test_validation_duration_and_times(self):
        self.assertEqual(
            self._create(duration_minutes=0).status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self._create(start_time="18:00", end_time="17:00").status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_delete_activity(self):
        created = self._create().data
        response = self.owner_client.delete(f"/api/activities/{created['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Activity.objects.filter(pk=created["id"]).exists())
