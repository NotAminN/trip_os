from rest_framework import serializers

from .models import Destination


class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = (
            "id",
            "name",
            "country",
            "description",
            "image",
            "best_season",
            "estimated_daily_cost",
            "recommended_days",
            "created_at",
        )
