from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.search_service import search


class SearchView(APIView):
    """GET /api/search/?q=museum — grouped results across resources."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "")
        if not query.strip():
            return Response(
                {"detail": "Query parameter `q` is required."},
                status=400,
            )
        return Response(search(request.user, query))
