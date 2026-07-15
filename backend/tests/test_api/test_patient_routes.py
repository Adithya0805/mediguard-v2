"""
MediGuard V2 — Patient Route Tests

Tests for:
- POST /api/v1/patient/session (create session)
- GET  /api/v1/patient/session/{id} (get session)
- GET  /api/v1/patient/sessions (list sessions)

Covers: success paths, auth failures, validation errors, not-found cases.
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_API_KEY


class TestCreateSession:
    """POST /api/v1/patient/session"""

    async def test_create_session_success(self, ac: AsyncClient, sample_patient_payload):
        """Valid payload with API key should return 201 with session data."""
        with patch("app.api.v1.patient.PatientService") as MockService:
            mock_svc = AsyncMock()
            mock_session = MagicMock()
            mock_session.id         = uuid.UUID("12345678-1234-5678-1234-567812345678")
            mock_session.status     = "pending"
            mock_session.created_at = "2024-01-01T00:00:00"
            mock_svc.create_session.return_value = mock_session
            MockService.return_value = mock_svc

            with patch("app.api.v1.patient.AuditService"):
                response = await ac.post("/api/v1/patient/session", json=sample_patient_payload)

        assert response.status_code == 201
        body = response.json()
        assert "session_id" in body
        assert body["status"] == "pending"
        assert "message" in body

    async def test_create_session_missing_api_key(
        self, ac_no_auth: AsyncClient, sample_patient_payload
    ):
        """Requests without X-API-Key header must return 401."""
        response = await ac_no_auth.post(
            "/api/v1/patient/session", json=sample_patient_payload
        )
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

    async def test_create_session_wrong_api_key(
        self, ac_no_auth: AsyncClient, sample_patient_payload
    ):
        """Requests with incorrect API key must return 401."""
        response = await ac_no_auth.post(
            "/api/v1/patient/session",
            json=sample_patient_payload,
            headers={"X-API-Key": "definitely-wrong-key-xyz"},
        )
        assert response.status_code == 401

    async def test_create_session_missing_required_fields(self, ac: AsyncClient):
        """Payload missing required fields should return 422 Unprocessable Entity."""
        incomplete = {
            "patient_name": "Test",
            # missing patient_age, chief_complaint, symptoms, etc.
        }
        response = await ac.post("/api/v1/patient/session", json=incomplete)
        assert response.status_code == 422

    async def test_create_session_empty_symptoms(self, ac: AsyncClient, sample_patient_payload):
        """Payload with empty symptoms list should return 422 (Pydantic validator)."""
        payload = {**sample_patient_payload, "symptoms": []}
        response = await ac.post("/api/v1/patient/session", json=payload)
        assert response.status_code == 422

    async def test_create_session_invalid_age(self, ac: AsyncClient, sample_patient_payload):
        """Payload with age outside valid range [0-120] should return 422."""
        payload = {**sample_patient_payload, "patient_age": 999}
        response = await ac.post("/api/v1/patient/session", json=payload)
        assert response.status_code == 422


class TestGetSession:
    """GET /api/v1/patient/session/{session_id}"""

    async def test_get_session_success(
        self, ac: AsyncClient, sample_session_id, sample_session_response
    ):
        """Valid session ID with existing session should return 200."""
        with patch("app.api.v1.patient.PatientService") as MockService:
            mock_svc = AsyncMock()
            mock_svc.get_session.return_value = sample_session_response
            MockService.return_value = mock_svc

            with patch("app.api.v1.patient.AuditService"):
                response = await ac.get(f"/api/v1/patient/session/{sample_session_id}")

        assert response.status_code == 200

    async def test_get_session_invalid_uuid(self, ac: AsyncClient):
        """Non-UUID path parameter should return 422."""
        response = await ac.get("/api/v1/patient/session/not-a-uuid")
        assert response.status_code == 422

    async def test_get_session_not_found(self, ac: AsyncClient):
        """Session that doesn't exist in DB should return 404."""
        from app.utils.exceptions import SessionNotFoundException
        unknown_id = str(uuid.uuid4())

        with patch("app.api.v1.patient.PatientService") as MockService:
            mock_svc = AsyncMock()
            mock_svc.get_session.side_effect = SessionNotFoundException(
                f"Session {unknown_id} not found"
            )
            MockService.return_value = mock_svc

            with patch("app.api.v1.patient.AuditService"):
                response = await ac.get(f"/api/v1/patient/session/{unknown_id}")

        assert response.status_code == 404


class TestListSessions:
    """GET /api/v1/patient/sessions"""

    async def test_list_sessions_success(self, ac: AsyncClient, sample_session_response):
        """Returns paginated list with count, limit, offset."""
        with patch("app.api.v1.patient.PatientService") as MockService:
            mock_svc = AsyncMock()
            mock_svc.list_sessions.return_value = [sample_session_response]
            MockService.return_value = mock_svc

            with patch("app.api.v1.patient.AuditService"):
                response = await ac.get("/api/v1/patient/sessions?limit=10&offset=0")

        assert response.status_code == 200
        body = response.json()
        assert "count" in body
        assert "results" in body
        assert body["limit"] == 10
        assert body["offset"] == 0

    async def test_list_sessions_invalid_limit(self, ac: AsyncClient):
        """limit=0 is below minimum ge=1, should return 422."""
        response = await ac.get("/api/v1/patient/sessions?limit=0")
        assert response.status_code == 422

    async def test_list_sessions_limit_too_high(self, ac: AsyncClient):
        """limit=200 exceeds max le=100, should return 422."""
        response = await ac.get("/api/v1/patient/sessions?limit=200")
        assert response.status_code == 422
