from rest_framework import serializers

from .models import WeatherForecast


class WeatherForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherForecast
        fields = (
            "id",
            "trip",
            "day",
            "date",
            "temperature_high",
            "temperature_low",
            "condition",
            "wind_speed",
            "humidity",
            "sunrise",
            "sunset",
            "created_at",
            "updated_at",
        )
