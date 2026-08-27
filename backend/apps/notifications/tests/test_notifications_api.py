from apps.activities.tests.helpers import make_trip, register
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import Notification
from apps.notifications.services.notification_service import notify

User = get_user_model()


class NotificationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice_client = cls.client_class()
        cls.alice_data = register(cls.alice_client, "alice@example.com", "alice")
        cls.alice = User.objects.get(pk=cls.alice_data["user"]["id"])

        cls.bob_client = cls.client_class()
        register(cls.bob_client, "bob@example.com", "bob")

        cls.trip = make_trip(cls.alice)

    def _notify_alice(self, title, type_="system", read=False):
        notification = notify(
            self.alice,
            type_=Notification.Type[type_.upper()] if isinstance(type_, str) else type_,
            title=title,
            message=f"msg: {title}",
            trip=self.trip,
        )
        if read:
            notification.mark_read()
        return notification

    def test_list_only_own_notifications(self):
        self._notify_alice("برای علی")
        bob = User.objects.get(username="bob")
        notify(bob, type_="system", title="برای باب")

        response = self.alice_client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [item["title"] for item in response.data["results"]]
        self.assertEqual(titles, ["برای علی"])

    def test_filter_unread(self):
        self._notify_alice("خوانده", read=True)
        unread = self._notify_alice("ناخوانده", type_="budget")

        data = self.alice_client.get("/api/notifications/?is_read=false").data
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["id"], unread.pk)

    def test_mark_single_notification_read(self):
        notification = self._notify_alice("تیک بزن")

        other_owner = self.client_class()
        register(other_owner, "mallory@example.com", "mallory")
        # Another user cannot mark someone else's notification.
        self.assertEqual(
            other_owner.patch(f"/api/notifications/{notification.pk}/read/").status_code,
            status.HTTP_404_NOT_FOUND,
        )

        response = self.alice_client.patch(f"/api/notifications/{notification.pk}/read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_read_all(self):
        self._notify_alice("a")
        self._notify_alice("b", type_="packing")
        self._notify_alice("c", type_="deadline", read=True)  # already read

        response = self.alice_client.post("/api/notifications/read-all/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["marked_read"], 2)

        remaining = self.alice_client.get("/api/notifications/?is_read=false").data
        self.assertEqual(remaining["count"], 0)

    def test_unauthenticated_denied(self):
        anonymous = self.client_class()
        self.assertEqual(anonymous.get("/api/notifications/").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_type_filter(self):
        budget_note = self._notify_alice("بودجه!", type_="budget")
        self._notify_alice("سیستم")

        data = self.alice_client.get("/api/notifications/?type=budget").data
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["id"], budget_note.pk)
