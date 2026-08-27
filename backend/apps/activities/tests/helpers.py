"""Shared fixtures for API tests."""

from datetime import date

from django.contrib.auth import get_user_model

PASSWORD = "S3cure-Passw0rd!"


def register(client, email, username):
    """Register + authenticate an APIClient. Returns the token payload."""
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
    assert response.status_code == 201, response.data
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
