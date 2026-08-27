from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Trip, TripDay, TripMember

User = get_user_model()


class MemberUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "username", "avatar")


class TripMemberSerializer(serializers.ModelSerializer):
    user = MemberUserSerializer(read_only=True)

    class Meta:
        model = TripMember
        fields = ("id", "user", "role", "joined_at")
        read_only_fields = ("id", "joined_at")


class TripMemberAddSerializer(serializers.Serializer):
    """Add an existing user to a trip by email or username."""

    email = serializers.EmailField(required=False, write_only=True)
    username = serializers.CharField(required=False, write_only=True)
    role = serializers.ChoiceField(
        choices=TripMember.Role.choices, default=TripMember.Role.VIEWER
    )

    def validate(self, attrs):
        if bool(attrs.get("email")) == bool(attrs.get("username")):
            raise serializers.ValidationError(
                "Provide exactly one of `email` or `username`."
            )
        return attrs

    def get_target_user(self) -> User:
        email = self.validated_data.get("email")
        username = self.validated_data.get("username")
        if email:
            lookup = {"email__iexact": email}
        else:
            lookup = {"username__iexact": username}
        try:
            return User.objects.get(**lookup)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user found with these credentials.")


class TripDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = TripDay
        fields = (
            "id",
            "day_number",
            "date",
            "title",
            "notes",
            "weather_summary",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "day_number", "date", "created_at", "updated_at")


class TripListSerializer(serializers.ModelSerializer):
    days_count = serializers.IntegerField(read_only=True)
    my_role = serializers.CharField(read_only=True)
    owner = MemberUserSerializer(read_only=True)

    class Meta:
        model = Trip
        fields = (
            "id",
            "title",
            "destination",
            "country",
            "cover_image",
            "start_date",
            "end_date",
            "days_count",
            "travelers_count",
            "budget",
            "currency",
            "status",
            "my_role",
            "owner",
            "created_at",
            "updated_at",
        )


class TripDetailSerializer(TripListSerializer):
    days = TripDaySerializer(many=True, read_only=True)
    members = TripMemberSerializer(many=True, read_only=True)
    description = serializers.CharField(read_only=False, required=False, allow_blank=True)

    class Meta(TripListSerializer.Meta):
        fields = TripListSerializer.Meta.fields + ("description", "days", "members")


class ReorderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    position = serializers.IntegerField(min_value=0)


class TimelineReorderSerializer(serializers.Serializer):
    """Payload for PATCH /api/trips/{id}/timeline/reorder/."""

    day_id = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=("places", "activities"), default="places")
    items = ReorderItemSerializer(many=True, allow_empty=False)


class TripWriteSerializer(serializers.ModelSerializer):
    """Input serializer for creating/updating trips (validation only)."""

    class Meta:
        model = Trip
        fields = (
            "title",
            "destination",
            "country",
            "description",
            "cover_image",
            "start_date",
            "end_date",
            "travelers_count",
            "budget",
            "currency",
            "status",
        )

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be empty.")
        return value

    def validate_destination(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Destination cannot be empty.")
        return value

    def validate_budget(self, value):
        if value < 0:
            raise serializers.ValidationError("Budget must be zero or positive.")
        return value

    def validate_travelers_count(self, value):
        if value < 1:
            raise serializers.ValidationError("At least one traveler is required.")
        return value

    def validate_currency(self, value):
        return value.upper()

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "End date must be on or after the start date."}
            )
        return attrs
