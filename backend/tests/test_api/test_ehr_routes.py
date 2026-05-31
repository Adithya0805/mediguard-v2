import pytest
from fastapi import status
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

@pytest.mark.asyncio
async def test_get_ehr_patient_success(ac: AsyncClient):
    """Verifies that a valid patient ID retrieves correct clinical records from EHR sandbox."""
    response = await ac.get("/api/v1/ehr/patient/PATIENT-ACS-9912")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["patient_name"] == "Jameson Parker"
    assert data["age"] == 54
    assert data["gender"] == "male"
    assert "retrosternal crushing chest pain" in data["chief_complaint"]
    assert "Lisinopril 20mg daily" in data["current_medications"]
    assert data["vitals"]["bp"] == "148/92"

@pytest.mark.asyncio
async def test_get_ehr_patient_not_found(ac: AsyncClient):
    """Verifies that querying a non-existent patient ID returns 404 Not Found."""
    response = await ac.get("/api/v1/ehr/patient/PATIENT-INVALID-XYZ")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_sync_to_ehr_success(ac: AsyncClient):
    """Verifies that a valid session ID compiles, validates, and syndicates FHIR bundle successfully."""
    session_id = "b080278c-25cd-4a19-aab9-4c515206cd75"
    
    # Mock services
    with patch("app.api.v1.ehr.ReportService") as MockReportService, \
         patch("app.api.v1.ehr.PatientService") as MockPatientService, \
         patch("app.api.v1.ehr.AuditService") as MockAuditService:
         
        # Mock Report
        mock_report_svc = AsyncMock()
        mock_report = MagicMock()
        mock_report.fhir_bundle = {
            "resourceType": "Bundle",
            "id": session_id,
            "type": "document",
            "timestamp": "2026-05-30T12:00:00Z",
            "entry": [
                {
                    "fullUrl": "https://mediguard.ai/fhir/Patient/" + session_id,
                    "resource": {
                        "resourceType": "Patient",
                        "id": session_id,
                        "name": [{"text": "Jameson Parker"}]
                    }
                }
            ]
        }
        mock_report_svc.get_report.return_value = mock_report
        MockReportService.return_value = mock_report_svc
        
        # Mock Audit
        mock_audit_svc = AsyncMock()
        MockAuditService.return_value = mock_audit_svc
        
        # Mock Patient
        mock_patient_svc = AsyncMock()
        MockPatientService.return_value = mock_patient_svc

        response = await ac.post(f"/api/v1/ehr/sync/{session_id}")
        
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert "synced_at" in data
    assert "ehr_record_id" in data
    assert "successfully validated and syndicated" in data["message"].lower()

@pytest.mark.asyncio
async def test_sync_to_ehr_missing_fhir(ac: AsyncClient):
    """Verifies that attempting to sync a session without a compiled FHIR bundle returns 400."""
    session_id = "b080278c-25cd-4a19-aab9-4c515206cd75"
    
    with patch("app.api.v1.ehr.ReportService") as MockReportService, \
         patch("app.api.v1.ehr.PatientService") as MockPatientService, \
         patch("app.api.v1.ehr.AuditService") as MockAuditService:
         
        mock_report_svc = AsyncMock()
        mock_report = MagicMock()
        mock_report.fhir_bundle = None  # Missing bundle
        mock_report_svc.get_report.return_value = mock_report
        MockReportService.return_value = mock_report_svc
        
        response = await ac.post(f"/api/v1/ehr/sync/{session_id}")
        
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "not yet generated" in response.json()["detail"].lower()
