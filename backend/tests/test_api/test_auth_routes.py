import pytest
from fastapi import status
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, MagicMock
from app.schemas.auth import LoginResponse


@pytest.mark.asyncio
async def test_login_success(ac_no_auth: AsyncClient):
    """Verifies that valid clinician credentials generate a valid JWT token response."""
    payload = {
        "email": "robertson@mediguard.ai",
        "key_phrase": "ClinicalTriage2026!",
        "institution_code": "METRO-GEN-2026"
    }
    
    mock_res = LoginResponse(
        access_token="mock_signed_jwt_token_123",
        token_type="bearer",
        expires_in=28800,
        staff_id="a1111111-1111-1111-1111-111111111111",
        full_name="Dr. Robertson",
        role="physician",
        institution_name="Metro General Hospital",
        institution_code="METRO-GEN-2026"
    )

    with patch("app.api.v1.auth.AuthService") as MockAuthService:
        mock_svc = AsyncMock()
        mock_svc.authenticate_staff.return_value = mock_res
        MockAuthService.return_value = mock_svc

        response = await ac_no_auth.post("/api/v1/auth/login", json=payload)
        
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["full_name"] == "Dr. Robertson"
    assert data["role"] == "physician"


@pytest.mark.asyncio
async def test_login_unauthorized(ac_no_auth: AsyncClient):
    """Verifies that invalid clinician credentials return 401 Unauthorized."""
    payload = {
        "email": "robertson@mediguard.ai",
        "key_phrase": "WrongPassword!",
        "institution_code": "METRO-GEN-2026"
    }

    from app.utils.exceptions import AuthenticationException

    with patch("app.api.v1.auth.AuthService") as MockAuthService:
        mock_svc = AsyncMock()
        mock_svc.authenticate_staff.side_effect = AuthenticationException("Invalid email or password credentials.")
        MockAuthService.return_value = mock_svc

        response = await ac_no_auth.post("/api/v1/auth/login", json=payload)
        
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["message"] == "Invalid email or password credentials."


@pytest.mark.asyncio
async def test_get_me_success(ac: AsyncClient, app):
    """Verifies that a valid clinician JWT can retrieve clinician profile details from /me."""
    token = "mock_signed_jwt_token_123"
    headers = {"Authorization": f"Bearer {token}"}

    # Mock DB response for get_me
    mock_staff_data = [{
        "id": "a1111111-1111-1111-1111-111111111111",
        "email": "robertson@mediguard.ai",
        "full_name": "Dr. Robertson",
        "role": "physician",
        "specialization": "Cardiology",
        "institution_id": "inst-1234",
        "institution_code": "METRO-GEN-2026",
        "last_login_at": None,
        "login_count": 5
    }]
    mock_inst_data = [{"institution_name": "Metro General Hospital"}]

    from app.dependencies import get_db
    db_mock = MagicMock()
    
    # Chain the db query results for staff and institution queries
    staff_query = MagicMock()
    staff_query.data = mock_staff_data
    inst_query = MagicMock()
    inst_query.data = mock_inst_data
    
    # Setup returns
    db_mock.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
        staff_query,
        inst_query
    ]

    # Save original override and set mock override
    orig_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = lambda: db_mock

    try:
        response = await ac.get("/api/v1/auth/me", headers=headers)
    finally:
        # Restore original override
        if orig_override:
            app.dependency_overrides[get_db] = orig_override
        else:
            app.dependency_overrides.pop(get_db, None)
            
    assert response.status_code == status.HTTP_200_OK
    clinician = response.json()
    assert clinician["email"] == "robertson@mediguard.ai"
    assert clinician["full_name"] == "Dr. Robertson"
    assert clinician["role"] == "physician"
    assert clinician["specialization"] == "Cardiology"


@pytest.mark.asyncio
async def test_get_me_missing_auth_header(ac_no_auth: AsyncClient):
    """Verifies that accessing protected clinician profiles without auth header returns 401."""
    response = await ac_no_auth.get("/api/v1/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_get_me_invalid_token(ac_no_auth: AsyncClient):
    """Verifies that accessing protected clinician profiles with an invalid token returns 401."""
    headers = {"Authorization": "Bearer invalid_token_xyz"}
    response = await ac_no_auth.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
