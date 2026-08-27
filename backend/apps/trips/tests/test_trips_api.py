import datetime

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.trips.models import Trip, TripDay, TripMember

User = get_user_model()

TRIPS_URL = "/api/trips/"

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
    # Authenticate this client for all subsequent requests.
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return response.data


def trip_payload(**overrides):
    payload = {
        "title": "سفر به استانبول",
        "destination": "Istanbul",
        "country": "Turkey",
        "description": "یک سفر هفت‌روزه",
        "start_date": "2026-09-20",
        "end_date": "2026-09-25",
        "travelers_count": 2,
        "budget": 25000000,
        "currency": "IRR",
        "status": Trip.Status.PLANNING,
    }
    payload.update(overrides)
    return payload


class TripCRUDTests(APITestCase):
    def setUp(self):
        self.owner = register(self.client, "owner@example.com", "owner")

    def test_create_trip_generates_days_and_owner_member(self):
        response = self.client.post(TRIPS_URL, trip_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        trip_id = response.data["id"]
        trip = Trip.objects.get(pk=trip_id)

        # Owner membership created automatically.
        self.assertTrue(
            TripMember.objects.filter(
                trip=trip, user=trip.owner, role=TripMember.Role.OWNER
            ).exists()
        )

        # Days generated: Sep 20..25 -> 6 days with correct dates.
        self.assertEqual(trip.days.count(), trip.days_count)
        first_day = trip.days.order_by("day_number").first()
        self.assertEqual(first_day.day_number, 1)
        self.assertEqual(first_day.date, datetime.date(2026, 9, 20))
        last_day = trip.days.order_by("day_number").last()
        self.assertEqual(last_day.date, datetime.date(2026, 9, 25))

    def test_create_validation_errors(self):
        cases = [
            ({"end_date": "2026-09-10"}, "end before start"),
            ({"budget": -5}, "negative budget"),
            ({"travelers_count": 0}, "zero travelers"),
            ({"title": "   "}, "blank title"),
        ]
        for overrides, label in cases:
            with self.subTest(case=label):
                response = self.client.post(TRIPS_URL, trip_payload(**overrides), format="json")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Trip.objects.exists())

    def test_list_returns_only_own_trips(self):
        self.client.post(TRIPS_URL, trip_payload(), format="json")
        other_client = self.client_class()
        register(other_client, "stranger@example.com", "stranger")
        response = other_client.get(TRIPS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_other_users_trip_is_invisible_404(self):
        created = self.client.post(TRIPS_URL, trip_payload(), format="json").data
        other_client = self.client_class()
        register(other_client, "intruder@example.com", "intruder")

        response = other_client.get(f"{TRIPS_URL}{created['id']}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        patch_response = other_client.patch(
            f"{TRIPS_URL}{created['id']}/", {"title": "hacked"}, format="json"
        )
        self.assertEqual(patch_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_cannot_access_trips(self):
        anonymous = self.client_class()  # no credentials
        response = anonymous.get(TRIPS_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_includes_days_and_members(self):
        created = self.client.post(TRIPS_URL, trip_payload(), format="json").data
        response = self.client.get(f"{TRIPS_URL}{created['id']}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["days"]), 6)
        self.assertEqual(len(response.data["members"]), 1)
        self.assertEqual(response.data["members"][0]["role"], TripMember.Role.OWNER)
        self.assertEqual(response.data["my_role"], TripMember.Role.OWNER)

    def test_filter_by_status(self):
        active = trip_payload(status=Trip.Status.ACTIVE)
        self.client.post(TRIPS_URL, active, format="json")

        response = self.client.get(f"{TRIPS_URL}?status=planning")
        self.assertEqual(response.data["count"], 0)
        response = self.client.get(f"{TRIPS_URL}?status=active")
        self.assertEqual(response.data["count"], 1)

    def test_update_extending_dates_appends_days(self):
        created = self.client.post(TRIPS_URL, trip_payload(), format="json").data
        extended = self.client.patch(
            f"{TRIPS_URL}{created['id']}/",
            {"end_date": "2026-09-28"},
            format="json",
        )
        self.assertEqual(extended.status_code, status.HTTP_200_OK)
        self.assertEqual(len(extended.data["days"]), 9)
        last_day = extended.data["days"][-1]
        self.assertEqual(last_day["date"], "2026-09-28")

    def test_update_shrinking_dates_trims_days_and_keeps_content(self):
        created = self.client.post(TRIPS_URL, trip_payload(), format="json").data
        day_url = f"{TRIPS_URL}{created['id']}/days/"
        days = self.client.get(day_url).data
        first_day_id = days[0]["id"]

        self.client.patch(
            f"{day_url}{first_day_id}/", {"title": "روز اول"}, format="json"
        )

        shrunk = self.client.patch(
            f"{TRIPS_URL}{created['id']}/",
            {"start_date": "2026-09-22"},
            format="json",
        )
        self.assertEqual(shrunk.status_code, status.HTTP_200_OK)
        self.assertEqual(len(shrunk.data["days"]), 4)
        # Retained day keeps its user-edited content and gets a refreshed date.
        kept_first = shrunk.data["days"][0]
        self.assertEqual(kept_first["title"], "روز اول")
        self.assertEqual(kept_first["date"], "2026-09-22")

    def test_delete_trip_owner_only(self):
        created = self.client.post(TRIPS_URL, trip_payload(), format="json").data
        response = self.client.delete(f"{TRIPS_URL}{created['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Trip.objects.filter(pk=created["id"]).exists())


class TripRolePermissionTests(APITestCase):
    def setUp(self):
        self.owner_data = register(self.client, "boss@example.com", "boss")
        self.trip = Trip.objects.get(
            pk=self.client.post(TRIPS_URL, trip_payload(), format="json").data["id"]
        )
        self.detail_url = f"{TRIPS_URL}{self.trip.pk}/"

        self.editor_client = self.client_class()
        self.editor = register(self.editor_client, "editor@example.com", "editor")
        self.viewer_client = self.client_class()
        self.viewer = register(self.viewer_client, "watcher@example.com", "watcher")

        TripMember.objects.create(trip=self.trip, user=User.objects.get(pk=self.editor["user"]["id"]), role=TripMember.Role.EDITOR)
        TripMember.objects.create(trip=self.trip, user=User.objects.get(pk=self.viewer["user"]["id"]), role=TripMember.Role.VIEWER)

    def _login_as(self, client, data):
        response = client.post(
            "/api/auth/login/",
            {"email": data["user"]["email"], "password": PASSWORD},
            format="json",
        )
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_viewer_can_read_but_not_write(self):
        self._login_as(self.viewer_client, self.viewer)

        read = self.viewer_client.get(self.detail_url)
        self.assertEqual(read.status_code, status.HTTP_200_OK)
        self.assertEqual(read.data["my_role"], TripMember.Role.VIEWER)

        write = self.viewer_client.patch(self.detail_url, {"title": "nope"}, format="json")
        self.assertEqual(write.status_code, status.HTTP_403_FORBIDDEN)

    def test_editor_can_modify_itinerary_fields(self):
        self._login_as(self.editor_client, self.editor)
        response = self.editor_client.patch(
            self.detail_url, {"description": "برنامهٔ جدید"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["description"], "برنامهٔ جدید")

    def test_editor_cannot_delete_trip(self):
        self._login_as(self.editor_client, self.editor)
        response = self.editor_client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Trip.objects.filter(pk=self.trip.pk).exists())

    def test_non_member_cannot_add_members(self):
        stranger_client = self.client_class()
        stranger = register(stranger_client, "ghost@example.com", "ghost")
        self._login_as(stranger_client, stranger)
        response = stranger_client.post(
            f"{self.detail_url}members/",
            {"email": "someone@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_editor_cannot_manage_members_owner_can(self):
        # Editor attempt -> forbidden
        self._login_as(self.editor_client, self.editor)
        denied = self.editor_client.post(
            f"{self.detail_url}members/",
            {"username": "newbie", "role": "viewer"},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        # Owner adds by username
        register(self.client_class(), "newbie@example.com", "newbie")
        self._login_as(self.client, self.owner_data)
        allowed = self.client.post(
            f"{self.detail_url}members/",
            {"username": "newbie", "role": "viewer"},
            format="json",
        )
        self.assertEqual(allowed.status_code, status.HTTP_201_CREATED)
        self.assertEqual(allowed.data["role"], TripMember.Role.VIEWER)

    def test_add_duplicate_member_fails(self):
        self._login_as(self.client, self.owner_data)
        response = self.client.post(
            f"{self.detail_url}members/",
            {"email": "editor@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_unknown_user_fails(self):
        self._login_as(self.client, self.owner_data)
        response = self.client.post(
            f"{self.detail_url}members/",
            {"email": "missing@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_member(self):
        self._login_as(self.client, self.owner_data)
        viewer_id = self.viewer["user"]["id"]

        removed = self.client.delete(f"{self.detail_url}members/{viewer_id}/")
        self.assertEqual(removed.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            TripMember.objects.filter(trip=self.trip, user_id=viewer_id).exists()
        )

        # Viewer lost access entirely.
        self._login_as(self.viewer_client, self.viewer)
        gone = self.viewer_client.get(self.detail_url)
        self.assertEqual(gone.status_code, status.HTTP_404_NOT_FOUND)

    def test_remove_owner_fails(self):
        self._login_as(self.client, self.owner_data)
        owner_id = self.owner_data["user"]["id"]
        response = self.client.delete(f"{self.detail_url}members/{owner_id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TripDayTests(APITestCase):
    def setUp(self):
        register(self.client, "day-owner@example.com", "dayowner")
        created = self.client.post(TRIPS_URL, trip_payload(), format="json").data
        self.trip_id = created["id"]
        self.days_url = f"{TRIPS_URL}{self.trip_id}/days/"

    def test_list_days_ordered(self):
        response = self.client.get(self.days_url)
        numbers = [day["day_number"] for day in response.data]
        self.assertEqual(numbers, list(range(1, 7)))

    def test_update_day_title_notes(self):
        days = self.client.get(self.days_url).data
        day_id = days[2]["id"]
        response = self.client.patch(
            f"{self.days_url}{day_id}/",
            {"title": "گشت شهری", "notes": "موزه و بازار"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "گشت شهری")
