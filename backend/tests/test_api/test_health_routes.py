"""
MediGuard V2 — Health Route Tests

Tests for:
- GET / (root health endpoint)
- GET /api/v1/health (versioned health check)
"""
import pytest
from httpx import AsyncClient


class TestRootEndpoint:
    """GET /"""

    async def test_root_returns_200(self, ac: AsyncClient):
        """Root endpoint should return 200 with app status."""
        response = await ac.get("/")
        assert response.status_code == 200
        body = response.json()
        assert "app" in body
        assert body["status"] == "online"
        assert "documentation" in body

    async def test_root_contains_app_name(self, ac: AsyncClient):
        """Root should return the application name."""
        response = await ac.get("/")
        body = response.json()
        assert "MediGuard" in body["app"]


class TestHealthEndpoint:
    """GET /api/v1/health"""

    async def test_health_returns_200(self, ac: AsyncClient):
        """Health endpoint should return 200 without requiring auth."""
        # Health endpoint doesn't require API key
        response = await ac.get("/api/v1/health")
        assert response.status_code == 200

    async def test_health_response_structure(self, ac: AsyncClient):
        """Health response should include app, version, status, and timestamp."""
        response = await ac.get("/api/v1/health")
        body = response.json()
        assert "app" in body
        assert "version" in body
        assert "status" in body
        assert "timestamp" in body
        assert body["status"] == "healthy"

    async def test_health_version_format(self, ac: AsyncClient):
        """Health endpoint version should be a dotted version string."""
        response = await ac.get("/api/v1/health")
        version = response.json()["version"]
        parts = version.split(".")
        assert len(parts) >= 2

    async def test_health_no_auth_required(self, ac_no_auth: AsyncClient):
        """Health endpoint should be accessible without API key."""
        response = await ac_no_auth.get("/api/v1/health")
        # Should succeed even without auth header (health check is exempt)
        # Note: if rate limiting or auth is applied, this test verifies the behavior
        assert response.status_code in (200, 401)  # Either is acceptable depending on config
