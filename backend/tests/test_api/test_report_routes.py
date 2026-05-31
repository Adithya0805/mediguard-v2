"""
MediGuard V2 — Report Route Tests

Tests for:
- POST /api/v1/report/generate (trigger pipeline analysis)
- GET  /api/v1/report/{session_id} (poll report status)
- GET  /api/v1/report/{session_id}/audit (get audit trail)
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.utils.exceptions import SessionNotFoundException


class TestGenerateReport:
    """POST /api/v1/report/generate"""

    async def test_generate_report_success(
        self, ac: AsyncClient, sample_session_id, sample_session_response
    ):
        """Valid session in pending state should enqueue pipeline and return 202."""
        with patch("app.api.v1.report.PatientService") as MockPS, \
             patch("app.api.v1.report.AuditService"), \
             patch("app.api.v1.report.ReportService"):

            mock_ps = AsyncMock()
            mock_session = MagicMock()
            mock_session.status = "pending"
            mock_session.patient_name = "Test Patient"
            mock_session.patient_age = 45
            mock_session.patient_gender = "male"
            mock_session.chief_complaint = "Chest pain"
            mock_session.symptoms = ["chest_pain"]
            mock_session.medical_history = []
            mock_session.current_medications = []
            mock_session.allergies = []
            mock_session.vitals = {}
            mock_ps.get_session.return_value = mock_session
            mock_ps.update_session_status.return_value = None
            MockPS.return_value = mock_ps

            response = await ac.post(
                "/api/v1/report/generate",
                json={"session_id": sample_session_id}
            )

        assert response.status_code == 202
        body = response.json()
        assert "session_id" in body
        assert "status" in body

    async def test_generate_report_invalid_session(self, ac: AsyncClient):
        """Unknown session_id should return 404."""
        unknown_id = str(uuid.uuid4())

        with patch("app.api.v1.report.PatientService") as MockPS, \
             patch("app.api.v1.report.AuditService"), \
             patch("app.api.v1.report.ReportService"):

            mock_ps = AsyncMock()
            mock_ps.get_session.side_effect = SessionNotFoundException(
                f"Session {unknown_id} not found"
            )
            MockPS.return_value = mock_ps

            response = await ac.post(
                "/api/v1/report/generate",
                json={"session_id": unknown_id}
            )

        assert response.status_code == 404

    async def test_generate_report_already_completed(
        self, ac: AsyncClient, sample_session_id
    ):
        """Already-completed session should short-circuit and return 200."""
        with patch("app.api.v1.report.PatientService") as MockPS, \
             patch("app.api.v1.report.AuditService"), \
             patch("app.api.v1.report.ReportService"):

            mock_ps = AsyncMock()
            mock_session = MagicMock()
            mock_session.status = "completed"
            mock_ps.get_session.return_value = mock_session
            MockPS.return_value = mock_ps

            response = await ac.post(
                "/api/v1/report/generate",
                json={"session_id": sample_session_id}
            )

        # Already completed → 200 OK short-circuit
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "completed"

    async def test_generate_report_already_processing(
        self, ac: AsyncClient, sample_session_id
    ):
        """Pipeline already running should return 202 with processing status."""
        with patch("app.api.v1.report.PatientService") as MockPS, \
             patch("app.api.v1.report.AuditService"), \
             patch("app.api.v1.report.ReportService"):

            mock_ps = AsyncMock()
            mock_session = MagicMock()
            mock_session.status = "processing"
            mock_ps.get_session.return_value = mock_session
            MockPS.return_value = mock_ps

            response = await ac.post(
                "/api/v1/report/generate",
                json={"session_id": sample_session_id}
            )

        assert response.status_code == 202
        body = response.json()
        assert body["status"] == "processing"


class TestGetReport:
    """GET /api/v1/report/{session_id}"""

    async def test_get_report_still_processing(
        self, ac: AsyncClient, sample_session_id
    ):
        """Session in processing state should return 202."""
        with patch("app.api.v1.report.PatientService") as MockPS, \
             patch("app.api.v1.report.AuditService"), \
             patch("app.api.v1.report.ReportService"):

            mock_ps = AsyncMock()
            mock_session = MagicMock()
            mock_session.status = "processing"
            mock_ps.get_session.return_value = mock_session
            MockPS.return_value = mock_ps

            response = await ac.get(f"/api/v1/report/{sample_session_id}")

        assert response.status_code == 202
        assert response.json()["status"] == "processing"

    async def test_get_report_failed_session(
        self, ac: AsyncClient, sample_session_id
    ):
        """Session in failed state should return 500."""
        with patch("app.api.v1.report.PatientService") as MockPS, \
             patch("app.api.v1.report.AuditService"), \
             patch("app.api.v1.report.ReportService"):

            mock_ps = AsyncMock()
            mock_session = MagicMock()
            mock_session.status = "failed"
            mock_ps.get_session.return_value = mock_session
            MockPS.return_value = mock_ps

            response = await ac.get(f"/api/v1/report/{sample_session_id}")

        # Failed session returns 500 Internal Server Error
        assert response.status_code in (500, 503)
        body = response.json()
        assert body["status"] == "failed"

    async def test_get_report_invalid_uuid(self, ac: AsyncClient):
        """Non-UUID path parameter should return 422."""
        response = await ac.get("/api/v1/report/not-a-uuid")
        assert response.status_code == 422

    async def test_get_report_without_auth(self, ac_no_auth: AsyncClient, sample_session_id):
        """Report endpoint requires API key — missing key returns 401."""
        response = await ac_no_auth.get(f"/api/v1/report/{sample_session_id}")
        assert response.status_code == 401
