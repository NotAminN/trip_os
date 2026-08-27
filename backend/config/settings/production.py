"""Production settings.

Enforce strict security defaults. Deployment must supply real values via
environment variables; the process refuses to boot with insecure config.
"""

import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403
from .base import env_bool, env_list

DEBUG = False

_raw_secret_key = os.getenv("SECRET_KEY", "")
if not _raw_secret_key or _raw_secret_key == "change-me-in-production":
    raise ImproperlyConfigured("SECRET_KEY must be set in production.")

if not ALLOWED_HOSTS:  # noqa: F405
    raise ImproperlyConfigured("ALLOWED_HOSTS must be set in production.")

if not DB_NAME:  # noqa: F405
    raise ImproperlyConfigured(
        "PostgreSQL is required in production: set DB_NAME/DB_USER/DB_PASSWORD."
    )

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", 31536000))  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
if not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured("CORS_ALLOWED_ORIGINS must be set in production.")

# Never serve user-uploaded media through Django in production;
# front them with nginx/CDN instead.
SERVE_MEDIA_IN_PROD = env_bool("SERVE_MEDIA_IN_PROD", False)
