from rest_framework import serializers

from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Note
        fields = (
            "id",
            "trip",
            "day",
            "place",
            "title",
            "content",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "trip", "created_by", "created_at", "updated_at")

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Content cannot be empty.")
        return value
