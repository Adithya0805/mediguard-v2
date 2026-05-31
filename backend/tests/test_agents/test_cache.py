"""
MediGuard V2 — Cache Utility Tests

Tests for app.utils.cache module:
- TTL expiry behavior
- Cache hit/miss tracking
- LRU eviction at maxsize
- Cache key generation
- Invalidation
"""
import time
import pytest

from app.utils.cache import TTLCache, make_cache_key, session_cache_key, embedding_cache_key


class TestTTLCache:
    """TTLCache unit tests."""

    def test_set_and_get_returns_value(self):
        """Freshly set value should be retrievable."""
        cache = TTLCache(maxsize=10)
        cache.set("key1", {"data": 42}, ttl=60)
        result = cache.get("key1")
        assert result == {"data": 42}

    def test_missing_key_returns_none(self):
        """Get on unknown key returns None without error."""
        cache = TTLCache(maxsize=10)
        result = cache.get("nonexistent_key")
        assert result is None

    def test_expired_entry_returns_none(self):
        """Entry past TTL should return None and be evicted."""
        cache = TTLCache(maxsize=10)
        cache.set("key_exp", "expiring_value", ttl=0.01)  # 10ms TTL
        time.sleep(0.05)  # Wait for expiry
        result = cache.get("key_exp")
        assert result is None

    def test_invalidate_existing_key(self):
        """Explicitly invalidating a key should return True and remove it."""
        cache = TTLCache(maxsize=10)
        cache.set("key_to_del", "value", ttl=60)
        existed = cache.invalidate("key_to_del")
        assert existed is True
        assert cache.get("key_to_del") is None

    def test_invalidate_nonexistent_key(self):
        """Invalidating a non-existent key returns False gracefully."""
        cache = TTLCache(maxsize=10)
        existed = cache.invalidate("never_existed")
        assert existed is False

    def test_eviction_at_maxsize(self):
        """Cache evicts oldest entry when maxsize is exceeded."""
        cache = TTLCache(maxsize=3)
        cache.set("a", 1, ttl=60)
        cache.set("b", 2, ttl=60)
        cache.set("c", 3, ttl=60)
        cache.set("d", 4, ttl=60)  # Should evict "a"
        assert len(cache) == 3

    def test_stats_hit_rate_calculation(self):
        """Stats should track hits and misses correctly."""
        cache = TTLCache(maxsize=10)
        cache.set("key", "value", ttl=60)
        cache.get("key")       # hit
        cache.get("key")       # hit
        cache.get("missing")   # miss

        stats = cache.stats()
        assert stats["hits"] == 2
        assert stats["misses"] == 1
        assert stats["hit_rate"] == round(2 / 3, 3)

    def test_clear_removes_all_entries(self):
        """Clear should remove all cache entries."""
        cache = TTLCache(maxsize=10)
        cache.set("a", 1, ttl=60)
        cache.set("b", 2, ttl=60)
        cache.clear()
        assert len(cache) == 0
        assert cache.get("a") is None


class TestCacheKeyHelpers:
    """Cache key generation utility tests."""

    def test_make_cache_key_is_deterministic(self):
        """Same arguments always produce the same key."""
        key1 = make_cache_key("session", 42, name="test")
        key2 = make_cache_key("session", 42, name="test")
        assert key1 == key2

    def test_different_args_produce_different_keys(self):
        """Different arguments produce different cache keys."""
        key1 = make_cache_key("session", 1)
        key2 = make_cache_key("session", 2)
        assert key1 != key2

    def test_session_cache_key_format(self):
        """Session cache key should start with 'session:'."""
        key = session_cache_key("abc-123")
        assert key.startswith("session:")
        assert "abc-123" in key

    def test_embedding_cache_key_is_stable(self):
        """Same query text produces same embedding cache key."""
        key1 = embedding_cache_key("chest pain symptoms")
        key2 = embedding_cache_key("chest pain symptoms")
        assert key1 == key2

    def test_embedding_cache_key_different_texts_differ(self):
        """Different query texts produce different embedding cache keys."""
        key1 = embedding_cache_key("chest pain")
        key2 = embedding_cache_key("back pain")
        assert key1 != key2
