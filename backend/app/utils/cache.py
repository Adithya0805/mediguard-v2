"""
MediGuard V2 — In-Memory TTL Cache Utility

Provides a simple decorator and cache manager for caching read-heavy
endpoint and service results. Uses TTLCache from cachetools library.

Usage:
    from app.utils.cache import cache_manager

    # Cache a result for 60 seconds
    result = cache_manager.get("key")
    if result is None:
        result = expensive_call()
        cache_manager.set("key", result, ttl=60)
"""
from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Optional

from app.utils.logger import get_logger

logger = get_logger("app.utils.cache")

# Maximum number of items the cache can hold simultaneously
_MAX_CACHE_SIZE = 512


class TTLCache:
    """
    Simple thread-unsafe TTL cache backed by a plain dict.
    Safe for asyncio single-threaded use.

    Each entry stores (value, expire_at_monotonic).
    """

    def __init__(self, maxsize: int = _MAX_CACHE_SIZE) -> None:
        self._store: dict[str, tuple[Any, float]] = {}
        self._maxsize = maxsize
        self._hits   = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        """Return cached value or None if missing / expired."""
        entry = self._store.get(key)
        if entry is None:
            self._misses += 1
            return None

        value, expire_at = entry
        if time.monotonic() > expire_at:
            del self._store[key]
            self._misses += 1
            return None

        self._hits += 1
        return value

    def set(self, key: str, value: Any, ttl: float = 300.0) -> None:
        """Store a value with the given TTL in seconds."""
        # Evict entries when at capacity (remove oldest by insertion order)
        if len(self._store) >= self._maxsize:
            oldest_key = next(iter(self._store))
            del self._store[oldest_key]
            logger.debug("Cache eviction triggered", evicted_key=oldest_key[:32])

        self._store[key] = (value, time.monotonic() + ttl)

    def invalidate(self, key: str) -> bool:
        """Explicitly invalidate a cache entry. Returns True if it existed."""
        existed = key in self._store
        self._store.pop(key, None)
        return existed

    def clear(self) -> None:
        """Clear all cache entries."""
        self._store.clear()
        logger.debug("Cache cleared")

    def stats(self) -> dict:
        """Return cache hit/miss statistics."""
        total = self._hits + self._misses
        hit_rate = round(self._hits / total, 3) if total > 0 else 0.0
        return {
            "size":     len(self._store),
            "maxsize":  self._maxsize,
            "hits":     self._hits,
            "misses":   self._misses,
            "hit_rate": hit_rate,
        }

    def __len__(self) -> int:
        return len(self._store)


# ── Module-level singleton ────────────────────────────────────────────────────

# Single shared cache instance for all application caches
cache_manager = TTLCache(maxsize=_MAX_CACHE_SIZE)

# Separate LRU cache for RAG embedding results (smaller, faster TTL)
embedding_cache = TTLCache(maxsize=256)


# ── Cache key helpers ─────────────────────────────────────────────────────────

def make_cache_key(*args, **kwargs) -> str:
    """
    Generate a deterministic hash-based cache key from arbitrary arguments.

    Args:
        *args:   Positional arguments to hash.
        **kwargs: Keyword arguments to hash.

    Returns:
        A 16-char hex string suitable for use as a dict key.
    """
    raw = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()[:16]


def session_cache_key(session_id: str) -> str:
    """Typed cache key for session lookup results."""
    return f"session:{session_id}"


def report_cache_key(session_id: str) -> str:
    """Typed cache key for report lookup results."""
    return f"report:{session_id}"


def embedding_cache_key(query_text: str) -> str:
    """Typed cache key for embedding vector results."""
    return f"embed:{hashlib.md5(query_text.encode()).hexdigest()[:16]}"
