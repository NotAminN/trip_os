from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    trip_title = serializers.CharField(source="trip.title", read_only=True, default=None)

    class Meta:
        model = Notification
        fields = (
            "id",
            "trip",
            "trip_title",
            "type",
            "title",
            "message",
            "is_read",
            "created_at",
        )
        read_only_fields = fields
