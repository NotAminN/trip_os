from rest_framework import generics, permissions

from common.pagination import StandardPagination

from .models import Destination
from .serializers import DestinationSerializer


class DestinationListCreateView(generics.ListAPIView):
    """GET /api/destinations/?search=istanbul — public read-only discovery."""

    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPagination
    search_fields = ["name", "country", "description"]
    ordering_fields = ["name", "estimated_daily_cost"]


class DestinationDetailView(generics.RetrieveAPIView):
    """GET /api/destinations/{id}/ — public read-only."""

    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    permission_classes = [permissions.AllowAny]
