from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Liveness + database connectivity probe. Exposes no sensitive data."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        operation_id="health_check",
        responses={200: {"type": "object"}, 503: {"type": "object"}},
    )
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            database_ok = True
        except Exception:
            database_ok = False

        status_code = 200 if database_ok else 503
        return Response(
            {"status": "ok" if database_ok else "degraded", "database": "ok" if database_ok else "error"},
            status=status_code,
        )
