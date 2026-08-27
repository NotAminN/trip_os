from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.trips.permissions import require_writer

from .models import Trip, TripDay, TripMember
from .services.budget_service import calculate_budget
from .permissions import IsTripOwner, TripPermission
from .serializers import (
    TimelineReorderSerializer,
    TripDaySerializer,
    TripDetailSerializer,
    TripListSerializer,
    TripMemberAddSerializer,
    TripMemberSerializer,
    TripWriteSerializer,
)
from .services import timeline_service, trip_service

User = get_user_model()


class DashboardView(APIView):
    """GET /api/dashboard/ — aggregated data for the app dashboard."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: {"type": "object"}})
    def get(self, request):
        from .services.dashboard_service import get_dashboard

        return Response(get_dashboard(request.user))


class TripViewSet(viewsets.ModelViewSet):
    """
    Trips scoped to the requesting user's memberships.

    list/retrieve  -> any member (read-only roles included)
    create         -> any authenticated user (becomes the owner)
    update/delete  -> owner/editor for updates, owner for delete
    """

    permission_classes = [IsAuthenticated, TripPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    filterset_fields = ["status"]
    search_fields = ["title", "destination", "country"]
    ordering_fields = ["created_at", "updated_at", "start_date"]

    def get_queryset(self):
        queryset = (
            Trip.objects.for_user(self.request.user)
            .with_role_annotation(self.request.user)
            .with_common_related()
        )
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("members__user")
        elif self.action == "list":
            queryset = queryset.prefetch_related("days")
        return queryset.order_by(*Trip._meta.ordering)

    def get_serializer_class(self):
        if self.action == "list":
            return TripListSerializer
        if self.action == "retrieve":
            return TripDetailSerializer
        if self.action in ("create", "update", "partial_update"):
            return TripWriteSerializer
        return TripDetailSerializer

    def _fresh_trip_response(self, trip):
        """Serialize a freshly loaded trip so mutated days/members are current
        (avoids serving stale prefetch caches after service-layer mutations)."""
        fresh = (
            Trip.objects.for_user(self.request.user)
            .with_role_annotation(self.request.user)
            .select_related("owner")
            .prefetch_related("days", "members__user")
            .get(pk=trip.pk)
        )
        return TripDetailSerializer(fresh, context=self.get_serializer_context())

    # --- CRUD wired through the service layer ---

    @extend_schema(request=TripWriteSerializer, responses={201: TripDetailSerializer})
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trip = trip_service.create_trip(
            owner=request.user, **serializer.validated_data
        )
        return Response(self._fresh_trip_response(trip).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=TripWriteSerializer, responses={200: TripDetailSerializer})
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        trip = trip_service.update_trip(instance, **serializer.validated_data)
        return Response(self._fresh_trip_response(trip).data)

    def destroy(self, request, *args, **kwargs):
        trip = self.get_object()
        role = trip_service.get_user_role(request.user, trip)
        if role != TripMember.Role.OWNER:
            return Response(
                {"detail": "Only the trip owner can delete this trip."},
                status=status.HTTP_403_FORBIDDEN,
            )
        trip.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # --- Members management ---

    @extend_schema(
        methods=["GET"], responses={200: TripMemberSerializer(many=True)}
    )
    @extend_schema(
        methods=["POST"],
        request=TripMemberAddSerializer,
        responses={201: TripMemberSerializer},
    )
    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        trip = self.get_object()

        if request.method == "GET":
            members = trip.members.select_related("user").order_by("joined_at")
            serializer = TripMemberSerializer(
                members, many=True, context=self.get_serializer_context()
            )
            return Response(serializer.data)

        # POST — owner only
        if trip_service.get_user_role(request.user, trip) != TripMember.Role.OWNER:
            return Response(
                {"detail": "Only the trip owner can manage members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        input_serializer = TripMemberAddSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        target_user = input_serializer.get_target_user()

        if trip.members.filter(user=target_user).exists():
            return Response(
                {"detail": "This user is already a member of the trip."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member = trip_service.add_member(trip, target_user, input_serializer.validated_data["role"])
        output = TripMemberSerializer(member, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    @extend_schema(responses={204: None})
    @action(
        detail=True,
        methods=["delete"],
        url_path=r"members/(?P<user_id>\d+)",
        permission_classes=[IsAuthenticated, TripPermission, IsTripOwner],
    )
    def remove_member(self, request, pk=None, user_id=None):
        trip = self.get_object()
        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if target_user == trip.owner:
            return Response(
                {"detail": "The trip owner cannot be removed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            trip_service.remove_member(trip, target_user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # --- Budget (authoritative money math lives in the backend) ---

    @extend_schema(
        methods=["GET"],
        responses={200: {"type": "object"}},
    )
    @action(detail=True, methods=["get"], url_path="budget")
    def budget(self, request, pk=None):
        """GET /api/trips/{id}/budget/ — calculated from expense rows."""
        trip = self.get_object()  # any member may view
        return Response(calculate_budget(trip))

    # --- Timeline reorder (drag & drop persistence) ---

    @extend_schema(
        methods=["PATCH"],
        request=TimelineReorderSerializer,
        responses={200: {"type": "object"}},
    )
    @action(detail=True, methods=["patch"], url_path="timeline/reorder")
    def timeline_reorder(self, request, pk=None):
        """Persist a drag & drop result.

        Body: {"day_id": 2, "kind": "places"|"activities",
               "items": [{"id": 14, "position": 0}, ...]}
        Items may move across days; the write is atomic.
        """
        trip = self.get_object()  # membership required (404 otherwise)
        require_writer(request.user, trip)  # viewers cannot reorder

        serializer = TimelineReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            day = timeline_service.reorder_timeline(
                trip=trip,
                day_id=serializer.validated_data["day_id"],
                items=serializer.validated_data["items"],
                kind=serializer.validated_data["kind"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "ok", "day_id": day.pk})

    # --- Days ---

    @extend_schema(methods=["GET"], responses={200: TripDaySerializer(many=True)})
    @action(detail=True, methods=["get"], url_path="days")
    def days(self, request, pk=None):
        trip = self.get_object()
        serializer = TripDaySerializer(
            trip.days.all(), many=True, context=self.get_serializer_context()
        )
        return Response(serializer.data)

    @extend_schema(methods=["PATCH"], request=TripDaySerializer, responses={200: TripDaySerializer})
    @action(
        detail=True,
        methods=["patch"],
        url_path=r"days/(?P<day_id>\d+)",
    )
    def update_day(self, request, pk=None, day_id=None):
        trip = self.get_object()  # enforces write-role permission via TripPermission
        day = get_object_or_404(trip.days, pk=day_id)
        serializer = TripDaySerializer(day, data=request.data, partial=True, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
