"""
Vercel serverless entry point.

Vercel's Python runtime imports this module for every request routed here
by the rewrites in backend/vercel.json. We normalize sys.path to the Django
project root (backend/) so `config.*` and `apps.*` resolve regardless of how
the function is packaged, then expose a standard WSGI application.
"""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()
# Some tooling looks specifically for `application`.
application = app  # noqa: F811
