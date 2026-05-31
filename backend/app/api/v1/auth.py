import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from jose import jwt
from app.config import settings
from app.dependencies import verify_jwt_token
from app.utils.logger import get_logger

logger = get_logger("app.api.v1.auth")
router = APIRouter()

def hash_password(password: str) -> str:
    """Securely hashes a plain-text password using SHA-256."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies that a plain-text password matches its SHA-256 hash."""
    return hash_password(plain_password) == hashed_password

# Clinical credentials stub database
# In enterprise clinical setups this verifies against active IAM databases (e.g. Supabase, Active Directory)
CLINICAL_DATABASE = {
    "robertson@mediguard.ai": {
        "name": "Dr. Robertson",
        "hashed_password": hash_password("ClinicalTriage2026!"),
        "role": "physician",
        "specialty": "Cardiology",
    }
}

class ClinicianLoginRequest(BaseModel):
    username: str = Field(..., description="Clinician email address")
    password: str = Field(..., description="Clinician password")

class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Signed JWT Bearer token")
    token_type: str = Field("bearer", description="Type of authorization token")
    name: str = Field(..., description="Full name of clinician")
    role: str = Field(..., description="Role profile of clinician")

@router.post("/login", response_model=TokenResponse)
async def login(credentials: ClinicianLoginRequest):
    """Authenticates clinician credentials and signs a secure JWT bearer token."""
    username = credentials.username.strip().lower()
    user = CLINICAL_DATABASE.get(username)
    
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        logger.warning("Clinician login failed: unauthorized credentials", username=username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )
        
    # Generate Token expiring in 12 hours
    expire = datetime.utcnow() + timedelta(hours=12)
    payload = {
        "sub": username,
        "name": user["name"],
        "role": user["role"],
        "specialty": user["specialty"],
        "exp": expire
    }
    
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    
    logger.info("Clinician successfully authenticated and session signed", name=user["name"], role=user["role"])
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        name=user["name"],
        role=user["role"]
    )

@router.get("/me")
async def get_me(clinician: dict = Depends(verify_jwt_token)):
    """Returns profile details of the currently authenticated clinician."""
    return clinician
