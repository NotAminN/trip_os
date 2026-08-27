from rest_framework import serializers

from apps.places.models import Place
from apps.trips.models import TripDay

from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):
    day = serializers.PrimaryKeyRelatedField(
        queryset=TripDay.objects.all(), allow_null=True, required=False
    )
    place = serializers.PrimaryKeyRelatedField(
        queryset=Place.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = Activity
        fields = (
            "id",
            "trip",
            "day",
            "place",
            "title",
            "description",
            "category",
            "start_time",
            "end_time",
            "duration_minutes",
            "cost",
            "currency",
            "completed",
            "position",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "trip", "position", "created_at", "updated_at")

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be empty.")
        return value

    def validate_currency(self, value):
        return value.upper()

    def validate_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Cost must be zero or positive.")
        return value

    def validate_duration_minutes(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError("Duration must be at least one minute.")
        return value

    def validate(self, attrs):
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_time": "End time must be after the start time."}
            )
        return attrs
