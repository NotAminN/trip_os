from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer
from .services.notification_service import mark_all_read


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — the authenticated user's own notifications.

    Filters: ?is_read=false  ·  ?type=budget
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["is_read", "type"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationReadView(APIView):
    """PATCH /api/notifications/{id}/read/ — mark a single notification read."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: None, 404: None})
    def patch(self, request, pk):
        notification = get_object_or_404(
            Notification, pk=pk, user=request.user
        )
        notification.mark_read()
        serializer = NotificationSerializer(notification, context={"request": request})
        return Response(serializer.data)


class NotificationReadAllView(APIView):
    """POST /api/notifications/read-all/ — bulk mark-as-read."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: {"type": "object"}})
    def post(self, request):
        updated = mark_all_read(request.user)
        return Response({"detail": "ok", "marked_read": updated}, status=status.HTTP_200_OK)
