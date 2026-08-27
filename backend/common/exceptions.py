"""
Consistent DRF exception handling.

Non-API errors (uncaught exceptions) still return Django's default 500 page;
API errors are normalized to predictable JSON bodies.
"""

import logging

from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None:
        logger.exception("Unhandled exception in API request", exc_info=exc)
        return None

    # Normalize single-item error payloads to {"detail": "..."} where the
    # client only needs a message (e.g. AuthenticationFailed, NotFound).
    if isinstance(response.data, dict) and "detail" in response.data:
        response.data = {"detail": str(response.data["detail"])}

    return response
