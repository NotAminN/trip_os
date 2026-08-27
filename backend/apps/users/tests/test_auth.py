import io

from PIL import Image
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


def make_image(name="avatar.png"):
    from django.core.files.uploadedfile import SimpleUploadedFile

    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), color=(77, 143, 216)).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class AuthFlowTests(APITestCase):
    REGISTER_URL = "/api/auth/register/"
    LOGIN_URL = "/api/auth/login/"
    REFRESH_URL = "/api/auth/refresh/"
    LOGOUT_URL = "/api/auth/logout/"
    ME_URL = "/api/users/me/"

    def _register_payload(self, **overrides):
        payload = {
            "email": "sara@example.com",
            "username": "sara",
            "first_name": "Sara",
            "last_name": "Ahmadi",
            "password": "S3cure-Passw0rd!",
            "password_confirm": "S3cure-Passw0rd!",
        }
        payload.update(overrides)
        return payload

    def test_register_returns_tokens_and_user(self):
        response = self.client.post(self.REGISTER_URL, self._register_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "sara@example.com")
        self.assertTrue(User.objects.filter(email="sara@example.com").exists())

    def test_register_password_mismatch_fails(self):
        payload = self._register_payload(password_confirm="different")
        response = self.client.post(self.REGISTER_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.exists())

    def test_register_duplicate_email_fails(self):
        self.client.post(self.REGISTER_URL, self._register_payload(), format="json")
        response = self.client.post(
            self.REGISTER_URL,
            self._register_payload(username="other"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)

    def test_register_weak_password_fails(self):
        payload = self._register_payload(password="123", password_confirm="123")
        response = self.client.post(self.REGISTER_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens_and_user(self):
        self.client.post(self.REGISTER_URL, self._register_payload(), format="json")

        response = self.client.post(
            self.LOGIN_URL,
            {"email": "sara@example.com", "password": "S3cure-Passw0rd!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "sara")

    def test_login_wrong_password_fails(self):
        self.client.post(self.REGISTER_URL, self._register_payload(), format="json")
        response = self.client.post(
            self.LOGIN_URL,
            {"email": "sara@example.com", "password": "wrong-password"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requires_authentication(self):
        response = self.client.get(self.ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_current_user(self):
        register = self.client.post(self.REGISTER_URL, self._register_payload(), format="json")
        access = register.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "sara@example.com")

        response = self.client.get(self.ME_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "sara")

    def test_patch_me_updates_profile(self):
        register = self.client.post(self.REGISTER_URL, self._register_payload(), format="json")
        access = register.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.patch(
            self.ME_URL,
            {"first_name": "Sara-new", "bio": "Travel lover"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Sara-new")
        user = User.objects.get(email="sara@example.com")
        self.assertEqual(user.bio, "Travel lover")

    def test_patch_me_cannot_change_email(self):
        register = self.client.post(self.REGISTER_URL, self._register_payload(), format="json")
        access = register.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.patch(self.ME_URL, {"email": "new@example.com"}, format="json")
        user = User.objects.get(email="sara@example.com")
        self.assertEqual(user.email, "sara@example.com")

    def test_refresh_flow(self):
        register = self.client.post(self.REGISTER_URL, self._register_payload(), format="json")
        refresh = register.data["refresh"]

        response = self.client.post(self.REFRESH_URL, {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        # ROTATE_REFRESH_TOKENS issues a new refresh token as well.
        self.assertIn("refresh", response.data)

    def test_logout_blacklists_refresh_token(self):
        register = self.client.post(self.REGISTER_URL, self._register_payload(), format="json")
        access = register.data["access"]
        refresh = register.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(self.LOGOUT_URL, {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # The old refresh token must now be rejected.
        response = self.client.post(self.REFRESH_URL, {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_token_fails(self):
        register = self.client.post(self.REGISTER_URL, self._register_payload(), format="json")
        access = register.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(self.LOGOUT_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AvatarUploadTests(APITestCase):
    AVATAR_URL = "/api/users/me/avatar/"

    def setUp(self):
        self.register = self.client.post(
            "/api/auth/register/",
            {
                "email": "reza@example.com",
                "username": "reza",
                "password": "S3cure-Passw0rd!",
                "password_confirm": "S3cure-Passw0rd!",
            },
            format="json",
        )
        self.access = self.register.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access}")

    def test_avatar_upload_updates_user(self):
        response = self.client.post(self.AVATAR_URL, {"avatar": make_image()}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = User.objects.get(email="reza@example.com")
        self.assertTrue(user.avatar)
        user.avatar.delete(save=False)
