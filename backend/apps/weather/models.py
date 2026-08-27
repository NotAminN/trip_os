from django.core.validators import MaxValueValidator
from django.db import models

from apps.trips.models import Trip, TripDay


class WeatherForecast(models.Model):
    """Per-day weather snapshot for a trip.

    Currently populated from seed/mock data; the service layer isolates the
    frontend from any future real weather provider.
    """

    class Condition(models.TextChoices):
        SUNNY = "sunny", "Sunny"
        PARTLY_CLOUDY = "partly_cloudy", "Partly Cloudy"
        CLOUDY = "cloudy", "Cloudy"
        RAIN = "rain", "Rain"
        THUNDERSTORM = "thunderstorm", "Thunderstorm"
        SNOW = "snow", "Snow"
        WINDY = "windy", "Windy"
        FOG = "fog", "Fog"

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="weather")
    day = models.ForeignKey(
        TripDay, on_delete=models.SET_NULL, related_name="weather", null=True, blank=True
    )
    date = models.DateField(db_index=True)
    temperature_high = models.IntegerField()
    temperature_low = models.IntegerField()
    condition = models.CharField(
        max_length=20, choices=Condition.choices, default=Condition.SUNNY
    )
    wind_speed = models.PositiveIntegerField(default=0)  # km/h
    humidity = models.PositiveSmallIntegerField(
        default=0, validators=[MaxValueValidator(100)]
    )  # percent
    sunrise = models.TimeField(null=True, blank=True)
    sunset = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("date",)
        constraints = [
            models.UniqueConstraint(fields=("trip", "date"), name="uniq_trip_weather_date"),
            models.CheckConstraint(
                condition=models.Q(temperature_low__lte=models.F("temperature_high")),
                name="weather_low_lte_high",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.trip.title} @ {self.date}: {self.condition}"
