import time
from typing import Any, Dict

class TTLCache:
    """
    Simple, thread-safe (via GIL for standard operations) in-memory TTL cache.
    Performs eviction based on TTL and Max Size.
    """
    def __init__(self, max_size: int = 100, ttl_seconds: int = 300):
        self.store: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.ttl = ttl_seconds
        self.hits = 0
        self.misses = 0

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

    def set(self, key: str, value: Any, ttl: int = None):
        # Evict oldest entry by expiry if limit reached
        if len(self.store) >= self.max_size and key not in self.store:
            oldest = min(self.store, key=lambda k: self.store[k]["expires"])
            del self.store[oldest]
        
        self.store[key] = {
            "value": value,
            "expires": time.time() + (ttl or self.ttl)
        }

    def invalidate(self, key: str):
        self.store.pop(key, None)

    def stats(self) -> dict:
        total = self.hits + self.misses
        return {
            "hits": self.hits,
            "misses": self.misses,
            "size": len(self.store),
            "hit_rate": round(self.hits / total * 100, 1) if total > 0 else 0.0
        }

# Create module-level cache instances
analytics_cache = TTLCache(max_size=50, ttl_seconds=300)
demo_cache = TTLCache(max_size=10, ttl_seconds=60)
