from rest_framework import serializers

from .models import PackingItem


class PackingItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackingItem
        fields = (
            "id",
            "trip",
            "category",
            "name",
            "quantity",
            "is_packed",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "trip", "created_at", "updated_at")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be empty.")
        return value

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least one.")
        return value
