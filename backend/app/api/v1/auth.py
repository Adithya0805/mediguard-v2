import time
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from pydantic import BaseModel, Field
from supabase import Client

from app.db.supabase_client import get_supabase_client
from app.dependencies import get_db, oauth2_scheme, get_current_staff, require_admin
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    StaffProfile,
    CreateStaffRequest,
    CreateInstitutionRequest,
    TokenData
)
from app.services.auth_service import AuthService, hash_password, verify_password
from app.utils.logger import get_logger

logger = get_logger("app.api.v1.auth")
router = APIRouter()

# IP-based rate limiting dictionary: {ip: [timestamps]} and lockout timestamp {ip: unlock_time}
LOGIN_ATTEMPTS: Dict[str, List[float]] = {}
LOCKOUTS: Dict[str, float] = {}


def enforce_login_rate_limit(ip: str) -> None:
    """Enforces max 5 failed attempts per IP per minute; locks out for 15 minutes on 6th."""
    now = time.time()
    
    # Check for active lockout
    if ip in LOCKOUTS:
        if now < LOCKOUTS[ip]:
            remaining = int(LOCKOUTS[ip] - now)
            logger.warning("Rate limit lockout active on IP", ip=ip, remaining_seconds=remaining)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Locked out. Please try again in {remaining} seconds."
            )
        else:
            # Lockout expired
            del LOCKOUTS[ip]

    # Filter attempts in the last 60 seconds
    if ip in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS[ip] = [t for t in LOGIN_ATTEMPTS[ip] if now - t < 60]
        if len(LOGIN_ATTEMPTS[ip]) >= 5:
            # Set 15-minute lockout (900 seconds)
            LOCKOUTS[ip] = now + 900
            logger.warning("IP rate limit exceeded; lock set for 15 minutes", ip=ip)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Locked out for 15 minutes."
            )


class ChangeKeyPhraseRequest(BaseModel):
    current_key_phrase: str = Field(..., min_length=8)
    new_key_phrase: str = Field(..., min_length=12)
    confirm_key_phrase: str = Field(..., min_length=12)


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    request: Request,
    db: Client = Depends(get_db)
):
    """Authenticates clinician email, key phrase, and institution code with brute-force rate protection."""
    ip_address = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("User-Agent", "unknown")

    # Enforce lockout rules first
    enforce_login_rate_limit(ip_address)

    auth_service = AuthService(db)
    try:
        response = await auth_service.authenticate_staff(
            email=credentials.email,
            key_phrase=credentials.key_phrase,
            institution_code=credentials.institution_code,
            ip_address=ip_address,
            user_agent=user_agent
        )
        # Clear failure counts on success
        LOGIN_ATTEMPTS.pop(ip_address, None)
        return response
    except HTTPException as e:
        # Keep lockout counts for raw HTTPExceptions
        raise e
    except Exception as e:
        # Log failed attempt for rate limiting
        if ip_address not in LOGIN_ATTEMPTS:
            LOGIN_ATTEMPTS[ip_address] = []
        LOGIN_ATTEMPTS[ip_address].append(time.time())
        raise e


@router.post("/logout")
async def logout(
    token: str = Depends(oauth2_scheme),
    db: Client = Depends(get_db)
):
    """Closes the current clinician's secure session."""
    auth_service = AuthService(db)
    await auth_service.logout(token)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=StaffProfile)
async def get_me(
    current_staff: TokenData = Depends(get_current_staff),
    db: Client = Depends(get_db)
):
    """Retrieves detailed profile metadata for the authenticated user session."""
    staff_res = db.table("clinical_staff").select("*").eq("id", current_staff.staff_id).execute()
    if not staff_res.data:
        raise HTTPException(status_code=404, detail="Staff account profile not found.")

    staff = staff_res.data[0]
    
    # Query institution details separately for mock client compatibility
    inst_res = db.table("institutions").select("institution_name").eq("id", staff["institution_id"]).execute()
    inst_name = inst_res.data[0]["institution_name"] if inst_res.data else "Unknown Institution"

    return StaffProfile(
        id=str(staff["id"]),
        email=staff["email"],
        full_name=staff["full_name"],
        role=staff["role"],
        specialization=staff.get("specialization"),
        institution_name=inst_name,
        institution_code=staff["institution_code"],
        last_login_at=staff.get("last_login_at"),
        login_count=staff["login_count"]
    )


@router.post("/change-key-phrase")
async def change_key_phrase(
    body: ChangeKeyPhraseRequest,
    token: str = Depends(oauth2_scheme),
    current_staff: TokenData = Depends(get_current_staff),
    db: Client = Depends(get_db)
):
    """Updates clinician's secure credentials and revokes all other active sessions."""
    if body.new_key_phrase != body.confirm_key_phrase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New key phrase values do not match."
        )

    # Fetch current credentials
    staff_res = db.table("clinical_staff").select("*").eq("id", current_staff.staff_id).execute()
    if not staff_res.data:
        raise HTTPException(status_code=404, detail="Clinician account profile not found.")
    
    staff = staff_res.data[0]
    if not verify_password(body.current_key_phrase, staff["hashed_key_phrase"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current key phrase is invalid."
        )

    hashed_new = hash_password(body.new_key_phrase)
    
    # Update hash in DB
    db.table("clinical_staff")\
        .update({"hashed_key_phrase": hashed_new})\
        .eq("id", current_staff.staff_id)\
        .execute()

    # Revoke all OTHER sessions for this staff member (keep current)
    current_token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    db.table("auth_sessions")\
        .update({"is_active": False, "revoked_at": datetime.utcnow().isoformat()})\
        .eq("staff_id", current_staff.staff_id)\
        .neq("token_hash", current_token_hash)\
        .execute()

    # Log password changed audit action
    auth_service = AuthService(db)
    await auth_service._log_auth_audit(
        action="password_changed",
        staff_id=current_staff.staff_id,
        institution_id=current_staff.institution_id,
        institution_code=current_staff.institution_code,
        email=staff["email"]
    )

    return {"message": "Key phrase updated successfully. Other active sessions revoked."}


# ==========================================
# INSTITUTIONAL ADMIN PANEL ENDPOINTS
# ==========================================

@router.post("/admin/staff", response_model=StaffProfile)
async def create_staff(
    request: CreateStaffRequest,
    current_staff: TokenData = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """Enrolls a new clinical staff account under the admin's institution."""
    auth_service = AuthService(db)
    return await auth_service.create_staff(
        request=request,
        creator_role=current_staff.role,
        creator_inst_code=current_staff.institution_code,
        creator_id=current_staff.staff_id
    )


@router.get("/admin/staff", response_model=List[Dict[str, Any]])
async def list_staff(
    current_staff: TokenData = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """Retrieves all staff profiles enrolled under the admin's institution."""
    staff_res = db.table("clinical_staff")\
        .select("*")\
        .eq("institution_code", current_staff.institution_code)\
        .execute()
    return staff_res.data or []


@router.delete("/admin/staff/{staff_id}")
async def deactivate_staff(
    staff_id: str,
    current_staff: TokenData = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """Deactivates a clinical staff member account."""
    auth_service = AuthService(db)
    await auth_service.deactivate_staff(
        staff_id=staff_id,
        deactivated_by=current_staff.staff_id,
        deactivator_role=current_staff.role,
        deactivator_inst_id=current_staff.institution_id
    )
    return {"message": "Clinical staff account deactivated successfully."}


@router.post("/admin/staff/{staff_id}/reactivate")
async def reactivate_staff(
    staff_id: str,
    current_staff: TokenData = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """Reactivates a deactivated clinical staff member account."""
    auth_service = AuthService(db)
    await auth_service.reactivate_staff(
        staff_id=staff_id,
        reactivated_by_id=current_staff.staff_id,
        role=current_staff.role,
        inst_id=current_staff.institution_id
    )
    return {"message": "Clinical staff account reactivated successfully."}


@router.get("/admin/audit-log", response_model=List[Dict[str, Any]])
async def get_audit_log(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_staff: TokenData = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """Retrieves paginated auth audit logs for the admin's institution."""
    auth_service = AuthService(db)
    return await auth_service.get_auth_audit_log(
        institution_id=current_staff.institution_id,
        limit=limit,
        offset=offset
    )


@router.post("/superadmin/institution")
async def create_institution(
    request: CreateInstitutionRequest,
    current_staff: TokenData = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """Enrolls a new multi-tenant institution and registers its first administrative user."""
    if current_staff.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin role privileges required."
        )
    auth_service = AuthService(db)
    return await auth_service.create_institution(request, current_staff.staff_id)
