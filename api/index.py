"""
Vercel serverless entry point.

Vercel only creates Serverless Functions from files inside the root-level
`api/` directory, so this thin wrapper loads the Django project that lives
in `backend/`, normalizing sys.path so `config.*` and `apps.*` resolve.
"""

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

# backend/.env is gitignored, so production env vars are absent on Vercel
# unless configured in the dashboard. Fall back to the committed example
# values so the function boots; real secrets should still be set as Vercel
# environment variables.
if not os.getenv("SECRET_KEY"):
    for line in (BACKEND_DIR / ".env.example").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())

if os.getenv("VERCEL"):
    # Frontend and Django function share the deployment origin, so always
    # trust it regardless of what CORS_ALLOWED_ORIGINS resolves to.
    origins = [f"https://{u}" for u in (os.getenv("VERCEL_PROJECT_PRODUCTION_URL"), os.getenv("VERCEL_URL")) if u]
    if origins:
        existing = os.environ.get("CORS_ALLOWED_ORIGINS", "")
        os.environ["CORS_ALLOWED_ORIGINS"] = (
            f"{existing},{','.join(origins)}" if existing else ",".join(origins)
        )

from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()
# Some tooling looks specifically for `application`.
application = app  # noqa: F811
