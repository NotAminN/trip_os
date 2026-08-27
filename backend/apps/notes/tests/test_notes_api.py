from apps.activities.tests.helpers import make_trip, register
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notes.models import Note
from apps.places.models import Place
from apps.trips.models import TripMember

User = get_user_model()


class NoteTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner_client = cls.client_class()
        owner_data = register(cls.owner_client, "nowner@example.com", "nowner")
        cls.owner = User.objects.get(pk=owner_data["user"]["id"])

        cls.viewer_client = cls.client_class()
        viewer_data = register(cls.viewer_client, "nviewer@example.com", "nviewer")
        cls.viewer = User.objects.get(pk=viewer_data["user"]["id"])

        cls.trip = make_trip(cls.owner)
        TripMember.objects.create(trip=cls.trip, user=cls.viewer, role=TripMember.Role.VIEWER)

        cls.other_trip = make_trip(cls.owner)
        cls.days = list(cls.trip.days.order_by("day_number"))
        cls.list_url = f"/api/trips/{cls.trip.pk}/notes/"

    def test_create_trip_level_note(self):
        response = self.owner_client.post(
            self.list_url,
            {"title": "یادداشت سفر", "content": "پاسپورت‌ها را فراموش نکن."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["day"])
        self.assertIsNone(response.data["place"])
        self.assertEqual(response.data["created_by"], self.owner.email)

    def test_create_scoped_to_day_and_place(self):
        place = self.owner_client.post(
            f"/api/trips/{self.trip.pk}/places/",
            {"name": "هتل آسمان", "category": "hotel", "day": self.days[0].pk},
            format="json",
        ).data

        response = self.owner_client.post(
            self.list_url,
            {"content": "چک‌این ساعت ۱۴", "day": self.days[1].pk, "place": place["id"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["day"], self.days[1].pk)
        self.assertEqual(response.data["place"], place["id"])

    def test_foreign_day_or_place_rejected(self):
        foreign_day = self.other_trip.days.first()
        foreign_place = self.owner_client.post(
            f"/api/trips/{self.other_trip.pk}/places/", {"name": "خارجی"}, format="json"
        ).data

        self.assertEqual(
            self.owner_client.post(
                self.list_url, {"content": "x", "day": foreign_day.pk}, format="json"
            ).status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.owner_client.post(
                self.list_url, {"content": "x", "place": foreign_place["id"]}, format="json"
            ).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_empty_content_rejected(self):
        response = self.owner_client.post(self.list_url, {"content": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filters_by_day_number_and_place(self):
        place = self.owner_client.post(
            f"/api/trips/{self.trip.pk}/places/",
            {"name": "رستوران", "day": self.days[0].pk},
            format="json",
        ).data
        self.owner_client.post(self.list_url, {"content": "یادداشت روز ۲", "day": self.days[1].pk}, format="json")
        self.owner_client.post(self.list_url, {"content": "یادداشت مکان", "place": place["id"]}, format="json")

        by_day = self.owner_client.get(f"{self.list_url}?day=2").data
        self.assertEqual(by_day["count"], 1)

        by_place = self.owner_client.get(f"{self.list_url}?place={place['id']}").data
        self.assertEqual(by_place["count"], 1)

    def test_scope_permissions(self):
        created = self.owner_client.post(self.list_url, {"content": "محرمانه"}, format="json").data
        detail_url = f"/api/notes/{created['id']}/"

        stranger = self.client_class()
        register(stranger, "nghost@example.com", "nghost")

        self.assertEqual(stranger.get(detail_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.viewer_client.get(detail_url).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.viewer_client.patch(detail_url, {"content": "hack"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        updated = self.owner_client.patch(detail_url, {"title": "عنوان جدید"}, format="json")
        self.assertEqual(updated.status_code, status.HTTP_200_OK)

    def test_delete_note(self):
        created = self.owner_client.post(self.list_url, {"content": "حذف شو"}, format="json").data
        response = self.owner_client.delete(f"/api/notes/{created['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Note.objects.filter(pk=created["id"]).exists())
