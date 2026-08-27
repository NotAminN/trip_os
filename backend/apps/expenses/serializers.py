from rest_framework import serializers

from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Expense
        fields = (
            "id",
            "trip",
            "day",
            "category",
            "title",
            "amount",
            "currency",
            "description",
            "expense_date",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "trip", "created_by", "created_at", "updated_at")
        extra_kwargs = {
            # Defaults are resolved in the view (day date -> trip start).
            "expense_date": {"required": False, "allow_null": True},
            "day": {"required": False, "allow_null": True},
        }

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate_currency(self, value):
        return value.upper()

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be empty.")
        return value
