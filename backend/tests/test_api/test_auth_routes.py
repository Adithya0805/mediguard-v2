import pytest
from fastapi import status
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_login_success(ac_no_auth: AsyncClient):
    """Verifies that valid clinician credentials generate a valid JWT token response."""
    payload = {
        "username": "robertson@mediguard.ai",
        "password": "ClinicalTriage2026!"
    }
    response = await ac_no_auth.post("/api/v1/auth/login", json=payload)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["name"] == "Dr. Robertson"
    assert data["role"] == "physician"

@pytest.mark.asyncio
async def test_login_unauthorized(ac_no_auth: AsyncClient):
    """Verifies that invalid clinician credentials return 401 Unauthorized."""
    payload = {
        "username": "robertson@mediguard.ai",
        "password": "WrongPassword!"
    }
    response = await ac_no_auth.post("/api/v1/auth/login", json=payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Invalid email or password credentials."

@pytest.mark.asyncio
async def test_get_me_success(ac_no_auth: AsyncClient):
    """Verifies that a valid clinician JWT can retrieve clinician profile details from /me."""
    # 1. Login to get token
    login_payload = {
        "username": "robertson@mediguard.ai",
        "password": "ClinicalTriage2026!"
    }
    login_response = await ac_no_auth.post("/api/v1/auth/login", json=login_payload)
    token = login_response.json()["access_token"]
    
    # 2. Access /me protected endpoint
    headers = {"Authorization": f"Bearer {token}"}
    response = await ac_no_auth.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    
    clinician = response.json()
    assert clinician["username"] == "robertson@mediguard.ai"
    assert clinician["name"] == "Dr. Robertson"
    assert clinician["role"] == "physician"
    assert clinician["specialty"] == "Cardiology"

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
