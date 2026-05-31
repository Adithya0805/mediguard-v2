"""
MediGuard V2 — Security Headers Middleware

Adds production-grade security headers to every HTTP response:
- X-Content-Type-Options: prevents MIME sniffing
- X-Frame-Options: prevents clickjacking
- X-XSS-Protection: legacy XSS filter hint
- Referrer-Policy: controls referrer leakage
- X-Request-ID: unique request tracing ID
- Strict-Transport-Security: HSTS in production
"""
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.utils.logger import get_logger

logger = get_logger("app.middleware.security_headers")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security-hardening HTTP response headers to all responses.
    HSTS is only applied when APP_ENV == 'production'.
    """

    def __init__(self, app: ASGIApp, environment: str = "development") -> None:
        super().__init__(app)
        self._environment = environment
        logger.info(
            "SecurityHeadersMiddleware initialized",
            environment=environment,
            hsts_enabled=(environment == "production"),
        )

    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate a unique request ID for distributed tracing
        request_id = str(uuid.uuid4())

        # Attach request_id to request state for downstream handlers
        request.state.request_id = request_id

        response = await call_next(request)

        # ── Security headers ──────────────────────────────────────────────────
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]         = "DENY"
        response.headers["X-XSS-Protection"]        = "1; mode=block"
        response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
        response.headers["X-Request-ID"]            = request_id
        response.headers["X-Powered-By"]            = "MediGuard-Clinical-AI/2.0"

        # HSTS only in production (HTTPS required)
        if self._environment == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Remove server fingerprinting header if present
        if "server" in response.headers:
            del response.headers["server"]
        if "Server" in response.headers:
            del response.headers["Server"]

        return response
