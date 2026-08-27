from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "avatar",
            "bio",
            "date_joined",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "email", "date_joined", "created_at", "updated_at")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}, validators=[validate_password]
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ("email", "username", "first_name", "last_name", "password", "password_confirm")

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class RegisterResponseSerializer(serializers.Serializer):
    user = UserSerializer(read_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


class LoginTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {"no_active_account": "No active account found with the given credentials."}

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["username"] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user, context=self.context).data
        return data


class AvatarUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("avatar",)

    def validate_avatar(self, value):
        max_bytes = 2 * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError("Avatar must be 2MB or smaller.")
        valid_types = {"image/jpeg", "image/png", "image/webp"}
        content_type = getattr(value.file, "content_type", "")
        if content_type and content_type not in valid_types:
            raise serializers.ValidationError("Only JPEG, PNG and WebP images are allowed.")
        return value
