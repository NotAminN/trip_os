from apps.activities.tests.helpers import make_trip, register
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.packing.models import PackingItem

User = get_user_model()


class PackingTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner_client = cls.client_class()
        owner_data = register(cls.owner_client, "packer@example.com", "packer")
        cls.owner = User.objects.get(pk=owner_data["user"]["id"])

        cls.viewer_client = cls.client_class()
        viewer_data = register(cls.viewer_client, "watcher@example.com", "watcher")
        cls.viewer = User.objects.get(pk=viewer_data["user"]["id"])

        from apps.trips.models import TripMember

        cls.trip = make_trip(cls.owner)
        TripMember.objects.create(
            trip=cls.trip, user=cls.viewer, role=TripMember.Role.VIEWER
        )

        cls.list_url = f"/api/trips/{cls.trip.pk}/packing/"
        cls.progress_url = f"{cls.list_url}progress/"

    def _add(self, name, quantity=1, category="other"):
        return self.owner_client.post(
            self.list_url,
            {"name": name, "quantity": quantity, "category": category},
            format="json",
        )

    def test_create_item(self):
        response = self._add("شارژر موبایل", quantity=2, category="electronics")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["is_packed"], False)
        self.assertEqual(response.data["quantity"], 2)

    def test_quantity_validation(self):
        response = self._add("نامعتبر", quantity=0)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_toggle_packed_and_progress(self):
        ids = [
            self._add(name).data["id"]
            for name in ("لباس", "پاسپورت", "شارژر", "عینک", "کتاب")
        ]
        self.owner_client.patch(f"/api/packing/{ids[0]}/", {"is_packed": True}, format="json")
        self.owner_client.patch(f"/api/packing/{ids[1]}/", {"is_packed": True}, format="json")

        progress = self.viewer_client.get(self.progress_url).data
        self.assertEqual(progress, {"total": 5, "packed": 2, "remaining": 3, "percentage": 40})

    def test_progress_empty_checklist(self):
        fresh_owner = self.client_class()
        fresh = register(fresh_owner, "fresh@example.com", "fresh")
        trip = make_trip(User.objects.get(pk=fresh["user"]["id"]))
        progress = fresh_owner.get(f"/api/trips/{trip.pk}/packing/progress/").data
        self.assertEqual(progress, {"total": 0, "packed": 0, "remaining": 0, "percentage": 0})

    def test_filters_by_category_and_packed(self):
        self._add("تی‌شرت", category="clothing")
        item = self._add("کرم ضدآفتاب", category="health").data
        self.owner_client.patch(f"/api/packing/{item['id']}/", {"is_packed": True}, format="json")

        clothing = self.owner_client.get(f"{self.list_url}?category=clothing").data
        self.assertEqual(clothing["count"], 1)

        packed = self.owner_client.get(f"{self.list_url}?is_packed=true").data
        self.assertEqual(packed["count"], 1)
        self.assertEqual(packed["results"][0]["name"], "کرم ضدآفتاب")

    def test_viewer_cannot_write(self):
        item = self._add("دستمال").data
        denied = self.viewer_client.patch(
            f"/api/packing/{item['id']}/", {"is_packed": True}, format="json"
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        refreshed = PackingItem.objects.get(pk=item["id"])
        self.assertFalse(refreshed.is_packed)

    def test_delete_item(self):
        item = self._add("چتر").data
        response = self.owner_client.delete(f"/api/packing/{item['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PackingItem.objects.filter(pk=item["id"]).exists())
