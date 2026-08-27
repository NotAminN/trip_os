from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.activities.models import Activity
from apps.places.models import Place
from apps.trips.models import Trip, TripDay, TripMember

User = get_user_model()

PASSWORD = "S3cure-Passw0rd!"


def register(client, email, username):
    response = client.post(
        "/api/auth/register/",
        {
            "email": email,
            "username": username,
            "password": PASSWORD,
            "password_confirm": PASSWORD,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return response.data


def make_trip(owner_user, start="2026-09-20", end="2026-09-25"):
    from apps.trips.services import trip_service

    return trip_service.create_trip(
        owner=owner_user,
        title="تست",
        destination="Testland",
        start_date=date.fromisoformat(start),
        end_date=date.fromisoformat(end),
        budget=1000,
    )


def place_payload(day=None, **overrides):
    payload = {
        "name": "موزه توپکاپی",
        "category": Place.Category.MUSEUM,
        "address": "Istanbul",
        "latitude": "41.008238",
        "longitude": "28.980251",
        "estimated_cost": 1500000,
        "start_time": "10:00",
        "end_time": "13:00",
        "duration_minutes": 180,
    }
    if day is not None:
        payload["day"] = day.pk
    payload.update(overrides)
    return payload


class PlaceTestsBase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner_client = cls.client_class()
        owner_data = register(cls.owner_client, "powner@example.com", "powner")
        cls.owner = User.objects.get(pk=owner_data["user"]["id"])

        cls.editor_client = cls.client_class()
        editor_data = register(cls.editor_client, "peditor@example.com", "peditor")
        cls.editor = User.objects.get(pk=editor_data["user"]["id"])

        cls.viewer_client = cls.client_class()
        viewer_data = register(cls.viewer_client, "pviewer@example.com", "pviewer")
        cls.viewer = User.objects.get(pk=viewer_data["user"]["id"])

        cls.trip = make_trip(cls.owner)
        TripMember.objects.create(trip=cls.trip, user=cls.editor, role=TripMember.Role.EDITOR)
        TripMember.objects.create(trip=cls.trip, user=cls.viewer, role=TripMember.Role.VIEWER)

        cls.other_trip = make_trip(cls.owner)
        cls.days = list(cls.trip.days.order_by("day_number"))
        cls.list_url = f"/api/trips/{cls.trip.pk}/places/"


class PlaceCrudTests(PlaceTestsBase):
    def test_create_assigns_auto_position_and_default_first_day(self):
        first = self.owner_client.post(self.list_url, place_payload(), format="json")
        second = self.owner_client.post(self.list_url, place_payload(name="دیگر"), format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data["position"], 0)
        self.assertEqual(second.data["position"], 1)
        # Day defaulted to trip's first day.
        self.assertEqual(first.data["day"], self.days[0].pk)

    def test_create_with_explicit_day(self):
        response = self.owner_client.post(
            self.list_url, place_payload(day=self.days[2]), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["day"], self.days[2].pk)

    def test_day_from_other_trip_rejected(self):
        other_day = TripDay.objects.filter(trip=self.other_trip).first()
        response = self.owner_client.post(
            self.list_url, place_payload(day=other_day), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_coordinate_and_time(self):
        bad_coords = place_payload(latitude="95.0")
        self.assertEqual(
            self.owner_client.post(self.list_url, bad_coords, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        bad_times = place_payload(start_time="15:00", end_time="14:00")
        self.assertEqual(
            self.owner_client.post(self.list_url, bad_times, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_filtering_by_category_and_day_number(self):
        day2 = self.days[1]
        self.owner_client.post(self.list_url, place_payload(day=day2, category="restaurant"), format="json")
        self.owner_client.post(self.list_url, place_payload(category="museum"), format="json")

        by_cat = self.owner_client.get(f"{self.list_url}?category=restaurant")
        self.assertEqual(by_cat.data["count"], 1)

        by_day = self.owner_client.get(f"{self.list_url}?day=2")
        self.assertEqual(by_day.data["count"], 1)
        self.assertEqual(by_day.data["results"][0]["category"], "restaurant")

    def test_ordering_by_position(self):
        a = self.owner_client.post(self.list_url, place_payload(name="A"), format="json")
        b = self.owner_client.post(self.list_url, place_payload(name="B"), format="json")
        c = self.owner_client.post(self.list_url, place_payload(name="C"), format="json")

        listing = self.owner_client.get(f"{self.list_url}?ordering=position")
        positions = [item["position"] for item in listing.data["results"]]
        self.assertEqual(positions, sorted(positions))
        self.assertEqual(listing.data["count"], 3)

    def test_detail_scoped_to_members(self):
        created = self.owner_client.post(self.list_url, place_payload(), format="json").data

        stranger = self.client_class()
        register(stranger, "pghost@example.com", "pghost")
        self.assertEqual(
            stranger.get(f"/api/places/{created['id']}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.viewer_client.get(f"/api/places/{created['id']}/").status_code,
            status.HTTP_200_OK,
        )

    def test_role_permissions_on_write(self):
        created = self.owner_client.post(self.list_url, place_payload(), format="json").data
        detail_url = f"/api/places/{created['id']}/"

        # Viewer read OK / write denied.
        self.assertEqual(
            self.viewer_client.patch(detail_url, {"notes": "x"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        # Editor write allowed.
        updated = self.editor_client.patch(detail_url, {"notes": "بلیط وی آی پی"}, format="json")
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["notes"], "بلیط وی آی پی")

        # Non-member list -> 404.
        stranger = self.client_class()
        register(stranger, "pghost2@example.com", "pghost2")
        self.assertEqual(stranger.get(self.list_url).status_code, status.HTTP_404_NOT_FOUND)


class TimelineReorderTests(PlaceTestsBase):
    def setUp(self):
        super().setUp()
        self.reorder_url = f"/api/trips/{self.trip.pk}/timeline/reorder/"
        ids = [
            self.owner_client.post(self.list_url, place_payload(name=n), format="json").data["id"]
            for n in ("A", "B", "C")
        ]
        self.ids = ids

    def test_reorder_within_same_day_persists(self):
        payload = {
            "day_id": self.days[0].pk,
            "items": [{"id": i, "position": p} for p, i in enumerate(reversed(self.ids))],
        }
        response = self.owner_client.patch(self.reorder_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        listing = self.owner_client.get(f"{self.list_url}?ordering=position").data
        names_by_position = [item["name"] for item in listing["results"]]
        self.assertEqual(names_by_position, ["C", "B", "A"])

    def test_cross_day_move_changes_day(self):
        target_day = self.days[2]
        payload = {
            "day_id": target_day.pk,
            "items": [{"id": self.ids[0], "position": 5}],
        }
        response = self.owner_client.patch(self.reorder_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        moved = self.owner_client.get(f"/api/places/{self.ids[0]}/").data
        self.assertEqual(moved["day"], target_day.pk)
        self.assertEqual(moved["position"], 5)

    def test_invalid_item_id_atomic_no_partial_write(self):
        before = self.owner_client.get(f"{self.list_url}?ordering=position").data

        payload = {
            "day_id": self.days[0].pk,
            "items": [
                {"id": self.ids[0], "position": 9},
                {"id": 999999, "position": 1},  # bogus id must abort everything
            ],
        }
        response = self.owner_client.patch(self.reorder_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        after = self.owner_client.get(f"{self.list_url}?ordering=position").data
        self.assertEqual(
            [i["position"] for i in before["results"]],
            [i["position"] for i in after["results"]],
        )

    def test_viewer_cannot_reorder(self):
        payload = {
            "day_id": self.days[0].pk,
            "items": [{"id": self.ids[0], "position": 0}],
        }
        response = self.viewer_client.patch(self.reorder_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editor_can_reorder_activities(self):
        act_ids = []
        for name in ("X", "Y"):
            response = self.editor_client.post(
                f"/api/trips/{self.trip.pk}/activities/",
                {"title": name, "day": self.days[0].pk},
                format="json",
            )
            act_ids.append(response.data["id"])

        payload = {
            "kind": "activities",
            "day_id": self.days[0].pk,
            "items": [{"id": i, "position": p} for p, i in enumerate(reversed(act_ids))],
        }
        response = self.editor_client.patch(self.reorder_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        listing = self.editor_client.get(
            f"/api/trips/{self.trip.pk}/activities/?ordering=position"
        ).data
        titles = [item["title"] for item in listing["results"]]
        self.assertEqual(titles, ["Y", "X"])
