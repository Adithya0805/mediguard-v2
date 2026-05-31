"""
MediGuard V2 — Rate Limiter Middleware

Sliding-window rate limiting per IP address:
- Default: 60 requests/minute for all /api/v1 routes
- Strict:  10 requests/minute for analysis endpoint
- Returns 429 with Retry-After header on limit breach
"""
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.utils.logger import get_logger

logger = get_logger("app.middleware.rate_limiter")

# Sliding window stores: ip_address -> deque of timestamps (seconds)
_default_windows: Dict[str, Deque[float]] = defaultdict(deque)
_strict_windows:  Dict[str, Deque[float]] = defaultdict(deque)

# Rate limit configuration
_WINDOW_SECONDS  = 60       # 1 minute window
_DEFAULT_LIMIT   = 60       # requests per window per IP
_STRICT_LIMIT    = 10       # for expensive analysis routes

# Routes that receive strict limiting (substring match)
_STRICT_ROUTES = ["/report/generate", "/report/analyze"]


def _is_strict_route(path: str) -> bool:
    """Check if a request path falls under the strict rate limit tier."""
    return any(route in path for route in _STRICT_ROUTES)


def _check_rate(
    windows: Dict[str, Deque[float]],
    key: str,
    limit: int,
    now: float,
) -> tuple[bool, int, int]:
    """
    Sliding window check. Returns (allowed, remaining, retry_after).

    Prunes timestamps older than the window, then checks count.
    """
    window = windows[key]

    # Evict expired timestamps
    cutoff = now - _WINDOW_SECONDS
    while window and window[0] < cutoff:
        window.popleft()

    if len(window) >= limit:
        # Calculate when the oldest request expires
        retry_after = int(_WINDOW_SECONDS - (now - window[0])) + 1
        return False, 0, retry_after

    # Record this request
    window.append(now)
    remaining = limit - len(window)
    return True, remaining, 0


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware for per-IP sliding-window rate limiting.

    Applies to all /api/v1 routes. Health check routes are exempt.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        logger.info(
            "RateLimiterMiddleware initialized",
            default_limit=_DEFAULT_LIMIT,
            strict_limit=_STRICT_LIMIT,
            window_seconds=_WINDOW_SECONDS,
        )

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Exempt health check and docs from rate limiting
        if path in ("/", "/docs", "/openapi.json", "/api/v1/health"):
            return await call_next(request)

        # Only rate-limit API routes
        if not path.startswith("/api/"):
            return await call_next(request)

        client_ip = (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )

        now = time.monotonic()
        is_strict = _is_strict_route(path)

        if is_strict:
            allowed, remaining, retry_after = _check_rate(
                _strict_windows, client_ip, _STRICT_LIMIT, now
            )
        else:
            allowed, remaining, retry_after = _check_rate(
                _default_windows, client_ip, _DEFAULT_LIMIT, now
            )

        if not allowed:
            logger.warning(
                "Rate limit exceeded",
                client_ip=client_ip,
                path=path,
                tier="strict" if is_strict else "default",
                retry_after=retry_after,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": f"Too many requests. Retry after {retry_after} seconds.",
                    "retry_after_seconds": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(_STRICT_LIMIT if is_strict else _DEFAULT_LIMIT),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Window": str(_WINDOW_SECONDS),
                },
            )

        response = await call_next(request)

        # Inject rate limit headers into successful responses
        limit = _STRICT_LIMIT if is_strict else _DEFAULT_LIMIT
        response.headers["X-RateLimit-Limit"]     = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"]    = str(_WINDOW_SECONDS)

        return response
