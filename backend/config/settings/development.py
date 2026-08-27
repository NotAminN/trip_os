"""Development settings."""

from .base import *  # noqa: F401,F403
from .base import env_list

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
