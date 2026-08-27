import datetime

from apps.activities.tests.helpers import make_trip, register
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.trips.models import TripMember
from apps.weather.models import WeatherForecast

User = get_user_model()


class WeatherTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner_client = cls.client_class()
        owner_data = register(cls.owner_client, "wowner@example.com", "wowner")
        cls.owner = User.objects.get(pk=owner_data["user"]["id"])

        cls.viewer_client = cls.client_class()
        viewer_data = register(cls.viewer_client, "wviewer@example.com", "wviewer")
        cls.viewer = User.objects.get(pk=viewer_data["user"]["id"])

        cls.trip = make_trip(cls.owner)
        TripMember.objects.create(trip=cls.trip, user=cls.viewer, role=TripMember.Role.VIEWER)

        day_one = cls.trip.days.get(day_number=1)
        WeatherForecast.objects.create(
            trip=cls.trip,
            day=day_one,
            date=cls.trip.start_date,
            temperature_high=31,
            temperature_low=22,
            condition=WeatherForecast.Condition.SUNNY,
            wind_speed=12,
            humidity=45,
            sunrise=datetime.time(6, 15),
            sunset=datetime.time(19, 5),
        )
        WeatherForecast.objects.create(
            trip=cls.trip,
            date=cls.trip.start_date + datetime.timedelta(days=1),
            temperature_high=27,
            temperature_low=20,
            condition=WeatherForecast.Condition.RAIN,
            wind_speed=25,
            humidity=80,
        )
        cls.url = f"/api/trips/{cls.trip.pk}/weather/"

    def test_forecast_list_ordered_by_date(self):
        response = self.owner_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["condition"], "sunny")
        self.assertEqual(data[0]["temperature_high"], 31)
        self.assertEqual(data[1]["condition"], "rain")

    def test_non_member_gets_404(self):
        stranger = self.client_class()
        register(stranger, "wghost@example.com", "wghost")
        self.assertEqual(stranger.get(self.url).status_code, status.HTTP_404_NOT_FOUND)

    def test_viewer_can_read(self):
        self.assertEqual(self.viewer_client.get(self.url).status_code, status.HTTP_200_OK)

    def test_weather_low_lte_high_constraint(self):
        with self.assertRaises(Exception):
            WeatherForecast.objects.create(
                trip=self.trip,
                date=self.trip.start_date + datetime.timedelta(days=2),
                temperature_high=20,
                temperature_low=25,
            )
