import time
import hashlib
from typing import Any, Dict

class TTLCache:
    """
    Simple, thread-safe (via GIL for standard operations) in-memory TTL cache.
    Performs eviction based on TTL and Max Size.
    """
    def __init__(self, maxsize: int = 100, ttl_seconds: int = 300, max_size: int = None):
        self.store: Dict[str, Dict[str, Any]] = {}
        self.max_size = maxsize if max_size is None else max_size
        self.ttl = ttl_seconds
        self.hits = 0
        self.misses = 0

    def __len__(self) -> int:
        return len(self.store)

    def get(self, key: str) -> Any | None:
        entry = self.store.get(key)
        if not entry:
            self.misses += 1
            return None
        if time.time() > entry["expires"]:
            del self.store[key]
            self.misses += 1
            return None
        self.hits += 1
        return entry["value"]

    def set(self, key: str, value: Any, ttl: float = None):
        # Evict oldest entry by expiry if limit reached
        if len(self.store) >= self.max_size and key not in self.store:
            oldest = min(self.store, key=lambda k: self.store[k]["expires"])
            del self.store[oldest]
        
        self.store[key] = {
            "value": value,
            "expires": time.time() + (ttl if ttl is not None else self.ttl)
        }

    def invalidate(self, key: str) -> bool:
        if key in self.store:
            del self.store[key]
            return True
        return False

    def clear(self) -> None:
        self.store.clear()

    def stats(self) -> dict:
        total = self.hits + self.misses
        return {
            "hits": self.hits,
            "misses": self.misses,
            "size": len(self.store),
            "hit_rate": round(self.hits / total, 3) if total > 0 else 0.0
        }

def make_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generates a stable, string-based cache key based on positional and keyword arguments.
    """
    serialized_args = [str(arg) for arg in args]
    serialized_kwargs = [f"{k}={v}" for k, v in sorted(kwargs.items())]
    components = [prefix] + serialized_args + serialized_kwargs
    return ":".join(components)

def session_cache_key(session_id: str) -> str:
    """
    Generates cache key for a patient session.
    """
    return f"session:{session_id}"

def embedding_cache_key(text: str) -> str:
    """
    Generates a stable cache key for embedding generation.
    """
    cleaned = text.strip().lower()
    h = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
    return f"embedding:{h}"

# Create module-level cache instances
analytics_cache = TTLCache(maxsize=50, ttl_seconds=300)
demo_cache = TTLCache(maxsize=10, ttl_seconds=60)
