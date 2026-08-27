from rest_framework import serializers

from apps.trips.models import TripDay

from .models import Place


class PlaceSerializer(serializers.ModelSerializer):
    day = serializers.PrimaryKeyRelatedField(
        queryset=TripDay.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = Place
        fields = (
            "id",
            "trip",
            "day",
            "name",
            "category",
            "description",
            "address",
            "latitude",
            "longitude",
            "image",
            "estimated_cost",
            "currency",
            "start_time",
            "end_time",
            "duration_minutes",
            "notes",
            "position",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "trip", "position", "created_at", "updated_at")

    def validate_currency(self, value):
        return value.upper()

    def validate_estimated_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Cost must be zero or positive.")
        return value

    def validate(self, attrs):
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_time": "End time must be after the start time."}
            )

        lat = attrs.get("latitude", getattr(self.instance, "latitude", None))
        lon = attrs.get("longitude", getattr(self.instance, "longitude", None))
        if (lat is None) != (lon is None):
            raise serializers.ValidationError(
                "Latitude and longitude must be provided together."
            )
        return attrs
