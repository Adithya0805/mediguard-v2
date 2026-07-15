"""
MediGuard V2 — pytest Configuration & Shared Fixtures

Provides:
- async test client (ac) with ASGITransport + dependency overrides
- mock Supabase client (mock_db)
- mock LLM router (mock_llm_router)
- sample patient payload factories
- sample session data factories
"""
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from app.config import settings
from app.dependencies import get_db, verify_api_key, verify_clinical_auth

# ── Override settings for tests ───────────────────────────────────────────────
TEST_API_KEY = settings.SECRET_KEY


# ── Mock database (Supabase) ──────────────────────────────────────────────────

def get_mock_db():
    """Returns a MagicMock Supabase client with chained query builder mocks."""
    db = MagicMock()
    execute_mock = MagicMock()
    execute_mock.data = []
    # Chain all common query patterns
    db.table.return_value.select.return_value.limit.return_value.execute.return_value = execute_mock
    db.table.return_value.select.return_value.eq.return_value.execute.return_value = execute_mock
    db.table.return_value.insert.return_value.execute.return_value = execute_mock
    db.table.return_value.update.return_value.eq.return_value.execute.return_value = execute_mock
    db.table.return_value.delete.return_value.eq.return_value.execute.return_value = execute_mock
    return db


def _mock_db_dependency():
    """FastAPI dependency override that yields a mock Supabase client."""
    yield get_mock_db()


def _mock_api_key_dependency():
    """FastAPI dependency override that always accepts the API key."""
    return TEST_API_KEY


# ── App-level fixture ─────────────────────────────────────────────────────────

@pytest.fixture
def app():
    """
    Returns the FastAPI application with database and auth dependencies overridden
    to use mocks — no real Supabase connection or API key validation during tests.
    """
    from app.main import app as fastapi_app

    # Override DB to avoid real Supabase calls
    fastapi_app.dependency_overrides[get_db] = _mock_db_dependency
    # Override auth to always pass
    from app.dependencies import get_current_staff
    from app.schemas.auth import TokenData
    fastapi_app.dependency_overrides[verify_api_key] = _mock_api_key_dependency
    fastapi_app.dependency_overrides[verify_clinical_auth] = lambda: {
        "username": "robertson@mediguard.ai",
        "name": "Dr. Robertson",
        "role": "physician",
        "specialty": "Cardiology"
    }
    fastapi_app.dependency_overrides[get_current_staff] = lambda: TokenData(
        staff_id="a1111111-1111-1111-1111-111111111111",
        institution_id="test-inst-1111-2222-3333-4444",
        institution_code="METRO-GEN-2026",
        role="physician",
        exp=9999999999
    )

    yield fastapi_app

    # Clean up overrides after each test
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def app_no_auth_override():
    """
    FastAPI app WITHOUT auth override — for testing auth enforcement.
    Still overrides DB so Supabase is mocked.
    """
    from app.main import app as fastapi_app

    # Only override DB, not auth
    fastapi_app.dependency_overrides[get_db] = _mock_db_dependency

    yield fastapi_app

    fastapi_app.dependency_overrides.clear()


@pytest.fixture
async def ac(app) -> AsyncGenerator[AsyncClient, None]:
    """
    Async HTTPX test client with both DB and auth mocked.
    Includes valid X-API-Key header.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"X-API-Key": TEST_API_KEY}
    ) as client:
        yield client


@pytest.fixture
async def ac_no_auth(app_no_auth_override) -> AsyncGenerator[AsyncClient, None]:
    """
    Async client WITHOUT X-API-Key header and WITHOUT auth dependency override.
    Used to verify 401 responses when auth is missing.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app_no_auth_override),
        base_url="http://test",
        # No headers — no API key
    ) as client:
        yield client


# ── Mock database fixture ─────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    """Returns a standalone MagicMock Supabase client for unit tests."""
    return get_mock_db()


# ── Sample data factories ─────────────────────────────────────────────────────

@pytest.fixture
def sample_patient_payload():
    """Valid PatientInput payload dict for testing."""
    return {
        "patient_name":        "Test Patient",
        "patient_age":         45,
        "patient_gender":      "male",
        "chief_complaint":     "Severe chest pain radiating to left arm for 30 minutes",
        "symptoms":            ["chest_pain", "shortness_of_breath", "diaphoresis"],
        "medical_history":     ["hypertension", "type_2_diabetes"],
        "current_medications": ["metformin", "lisinopril"],
        "allergies":           ["penicillin"],
        "vitals": {
            "bp":          "145/90",
            "heart_rate":  88,
            "temperature": 37.2,
            "spo2":        96,
        }
    }


@pytest.fixture
def sample_critical_patient_payload():
    """High-urgency PatientInput payload for emergency gate tests."""
    return {
        "patient_name":        "Emergency Patient",
        "patient_age":         62,
        "patient_gender":      "female",
        "chief_complaint":     "Crushing chest pain with sudden onset, sweating, and breathlessness",
        "symptoms":            ["crushing_chest_pain", "diaphoresis", "dyspnea", "nausea"],
        "medical_history":     ["coronary_artery_disease", "hypertension"],
        "current_medications": ["aspirin", "metoprolol", "atorvastatin"],
        "allergies":           [],
        "vitals": {
            "bp":          "185/115",
            "heart_rate":  112,
            "temperature": 36.8,
            "spo2":        91,
        }
    }


@pytest.fixture
def sample_polypharmacy_patient_payload():
    """Patient with 6 concurrent medications (polypharmacy threshold)."""
    return {
        "patient_name":        "Polypharmacy Patient",
        "patient_age":         78,
        "patient_gender":      "female",
        "chief_complaint":     "Dizziness and falls at home over the past two weeks",
        "symptoms":            ["dizziness", "falls", "fatigue"],
        "medical_history":     ["atrial_fibrillation", "heart_failure", "diabetes", "hypertension"],
        "current_medications": [
            "warfarin", "metformin", "furosemide",
            "spironolactone", "digoxin", "ramipril"
        ],
        "allergies":           ["sulfa"],
        "vitals": {
            "bp":          "110/70",
            "heart_rate":  55,
            "temperature": 36.5,
            "spo2":        95,
        }
    }


@pytest.fixture
def sample_session_id():
    """Deterministic UUID string for tests."""
    return str(uuid.UUID("12345678-1234-5678-1234-567812345678"))


@pytest.fixture
def sample_session_response(sample_session_id):
    """Mock session object resembling a Supabase row."""
    mock = MagicMock()
    mock.id             = uuid.UUID(sample_session_id)
    mock.patient_name   = "Test Patient"
    mock.patient_age    = 45
    mock.patient_gender = "male"
    mock.chief_complaint = "Severe chest pain"
    mock.symptoms       = ["chest_pain"]
    mock.medical_history = []
    mock.current_medications = ["metformin"]
    mock.allergies      = []
    mock.vitals         = {"bp": "145/90", "heart_rate": 88}
    mock.status         = "pending"
    mock.institution_id = "test-inst-1111-2222-3333-4444"
    mock.created_at     = datetime.now(timezone.utc)
    return mock


@pytest.fixture
def mock_patient_service(sample_session_response):
    """Mock PatientService with pre-configured responses."""
    svc = AsyncMock()
    svc.create_session.return_value = sample_session_response
    svc.get_session.return_value    = sample_session_response
    svc.list_sessions.return_value  = [sample_session_response]
    svc.update_session_status.return_value = None
    return svc


@pytest.fixture
def mock_report_service():
    """Mock ReportService."""
    svc = AsyncMock()
    mock_report = MagicMock()
    mock_report.report_pdf_url = "https://example.com/report.pdf"
    mock_report.fhir_bundle    = {"resourceType": "Bundle"}
    svc.get_report.return_value  = mock_report
    svc.save_report.return_value = None
    return svc


@pytest.fixture
def mock_audit_service():
    """Mock AuditService."""
    svc = AsyncMock()
    svc.log_action.return_value             = None
    svc.get_session_audit_trail.return_value = []
    return svc
