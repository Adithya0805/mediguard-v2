import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from jose import JWTError, jwt
from supabase import Client

from app.config import settings
from app.utils.logger import get_logger
from app.utils.exceptions import AuthenticationException, ForbiddenException, DatabaseException
from app.schemas.auth import (
    LoginResponse,
    StaffProfile,
    CreateStaffRequest,
    CreateInstitutionRequest,
    TokenData
)

logger = get_logger("app.services.auth_service")


def hash_password(password: str) -> str:
    """Hashes a plain-text password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verifies a plain-text password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8


class AuthService:
    """Manages secure password hashing, clinician JWT sessions, revocation checks, and HIPAA audits."""

    def __init__(self, db: Client):
        self.db = db

    async def _log_auth_audit(
        self,
        action: str,
        staff_id: Optional[str] = None,
        institution_id: Optional[str] = None,
        institution_code: Optional[str] = None,
        email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        failure_reason: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> None:
        """Inserts an entry into the immutable auth_audit_log table."""
        payload = {
            "action": action,
            "staff_id": staff_id,
            "institution_id": institution_id,
            "institution_code": institution_code,
            "email": email,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "failure_reason": failure_reason,
            "metadata": metadata or {}
        }
        try:
            logger.info("Writing auth audit entry", action=action, email=email, staff_id=staff_id)
            self.db.table("auth_audit_log").insert(payload).execute()
        except Exception as e:
            logger.error("Failed to insert auth audit log record", action=action, error=str(e))

    async def authenticate_staff(
        self,
        email: str,
        key_phrase: str,
        institution_code: str,
        ip_address: str,
        user_agent: str
    ) -> LoginResponse:
        """Authenticates clinician email, key phrase, and institution code, returning a secure JWT session."""
        email = email.lower().strip()
        institution_code = institution_code.upper().strip()

        # Step 2: Verify institution exists and is active
        try:
            inst_res = self.db.table("institutions")\
                .select("*")\
                .eq("institution_code", institution_code)\
                .eq("is_active", True)\
                .execute()
        except Exception as e:
            logger.error("DB query institutions error during login", error=str(e))
            raise DatabaseException(f"Database query failure: {str(e)}")

        if not inst_res.data:
            # Audit failure and raise generic credentials exception
            await self._log_auth_audit(
                action="login_invalid_institution",
                institution_code=institution_code,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason="institution_not_found"
            )
            raise AuthenticationException("Invalid credentials")

        institution = inst_res.data[0]
        institution_id = institution["id"]
        institution_name = institution["institution_name"]

        # Step 3: Find active staff by email AND institution_code
        try:
            staff_res = self.db.table("clinical_staff")\
                .select("*")\
                .eq("email", email)\
                .eq("institution_code", institution_code)\
                .execute()
        except Exception as e:
            logger.error("DB query clinical_staff error during login", error=str(e))
            raise DatabaseException(f"Database query failure: {str(e)}")

        if not staff_res.data:
            await self._log_auth_audit(
                action="login_failed",
                institution_id=institution_id,
                institution_code=institution_code,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason="user_not_found"
            )
            raise AuthenticationException("Invalid credentials")

        staff = staff_res.data[0]
        staff_id = staff["id"]

        # Step 4: Check if staff account is active
        if not staff["is_active"]:
            await self._log_auth_audit(
                action="login_account_inactive",
                staff_id=staff_id,
                institution_id=institution_id,
                institution_code=institution_code,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason="account_inactive"
            )
            raise AuthenticationException("Account inactive. Contact your administrator.")

        # Step 5: Verify key phrase / password
        if not verify_password(key_phrase, staff["hashed_key_phrase"]):
            await self._log_auth_audit(
                action="login_failed",
                staff_id=staff_id,
                institution_id=institution_id,
                institution_code=institution_code,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason="wrong_key_phrase"
            )
            raise AuthenticationException("Invalid credentials")

        # Step 6: Generate JWT Token
        expires_delta = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        expires_at = datetime.utcnow() + expires_delta
        
        token_payload = {
            "sub": str(staff_id),
            "staff_id": str(staff_id),
            "institution_id": str(institution_id),
            "institution_code": institution_code,
            "role": staff["role"],
            "exp": int(expires_at.timestamp())
        }
        
        token = jwt.encode(token_payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        # Step 7: Store session record in DB (SHA-256 hashed)
        session_data = {
            "staff_id": staff_id,
            "institution_id": institution_id,
            "token_hash": token_hash,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "expires_at": expires_at.isoformat(),
            "is_active": True
        }
        try:
            self.db.table("auth_sessions").insert(session_data).execute()
        except Exception as e:
            logger.error("DB insert session error during login", error=str(e))
            raise DatabaseException(f"Failed to record auth session: {str(e)}")

        # Step 8: Update staff login metrics
        try:
            self.db.table("clinical_staff")\
                .update({
                    "last_login_at": datetime.utcnow().isoformat(),
                    "login_count": staff["login_count"] + 1
                })\
                .eq("id", staff_id)\
                .execute()
        except Exception as e:
            logger.warning("Failed to update staff login stats (non-blocking)", error=str(e))

        # Step 9: Log success
        await self._log_auth_audit(
            action="login_success",
            staff_id=staff_id,
            institution_id=institution_id,
            institution_code=institution_code,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Step 10: Return login details
        return LoginResponse(
            access_token=token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
            staff_id=str(staff_id),
            full_name=staff["full_name"],
            role=staff["role"],
            institution_name=institution_name,
            institution_code=institution_code
        )

    async def verify_token(self, token: str) -> TokenData:
        """Verifies JWT token signature and ensures session has not been revoked."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
            token_data = TokenData(
                staff_id=payload.get("staff_id"),
                institution_id=payload.get("institution_id"),
                institution_code=payload.get("institution_code"),
                role=payload.get("role"),
                exp=payload.get("exp")
            )
        except JWTError as e:
            logger.warning("JWT decode failure", error=str(e))
            raise AuthenticationException("Invalid token")

        # Hash token to query status in DB
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        try:
            sess_res = self.db.table("auth_sessions")\
                .select("*")\
                .eq("token_hash", token_hash)\
                .eq("is_active", True)\
                .execute()
        except Exception as e:
            logger.error("DB session lookup error during verify", error=str(e))
            raise DatabaseException("Database verification failure")

        if not sess_res.data:
            logger.warning("Active session not found or revoked", token_hash=token_hash[:6])
            raise AuthenticationException("Invalid or revoked session token.")

        session = sess_res.data[0]
        expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
        if expires_at.timestamp() < datetime.utcnow().timestamp():
            # Session expired
            try:
                self.db.table("auth_sessions")\
                    .update({"is_active": False})\
                    .eq("id", session["id"])\
                    .execute()
            except Exception:
                pass
            raise AuthenticationException("Session token expired.")

        return token_data

    async def logout(self, token: str) -> None:
        """Revokes the current JWT session."""
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        try:
            sess_res = self.db.table("auth_sessions")\
                .update({"is_active": False, "revoked_at": datetime.utcnow().isoformat()})\
                .eq("token_hash", token_hash)\
                .execute()
            
            if sess_res.data:
                sess = sess_res.data[0]
                # Audit logout action
                await self._log_auth_audit(
                    action="logout",
                    staff_id=sess["staff_id"],
                    institution_id=sess["institution_id"]
                )
        except Exception as e:
            logger.error("DB error during logout revocation", error=str(e))
            raise DatabaseException(f"Failed to cleanly revoke auth session: {str(e)}")

    async def create_staff(self, request: CreateStaffRequest, creator_role: str, creator_inst_code: str, creator_id: str) -> StaffProfile:
        """Creates a new clinical staff account under the admin's institution."""
        if creator_role not in ["admin", "superadmin"]:
            raise ForbiddenException("Only institutional administrators can enroll clinical staff.")

        if creator_role == "admin" and creator_inst_code != request.institution_code:
            raise ForbiddenException("Administrators can only create staff within their own institution.")

        # Check if email exists
        email = request.email.lower().strip()
        existing = self.db.table("clinical_staff").select("id").eq("email", email).execute()
        if existing.data:
            raise ForbiddenException("A staff member with this clinical email address is already enrolled.")

        # Lookup institution and verify account count limits
        inst_res = self.db.table("institutions").select("*").eq("institution_code", request.institution_code).execute()
        if not inst_res.data:
            raise ForbiddenException("Target institution code does not exist.")
        
        institution = inst_res.data[0]
        staff_count_res = self.db.table("clinical_staff").select("id").eq("institution_code", request.institution_code).execute()
        if len(staff_count_res.data) >= institution["max_staff_accounts"]:
            raise ForbiddenException(f"Institution has reached its maximum staff account quota limit of {institution['max_staff_accounts']}.")

        # Insert new staff
        hashed_key = hash_password(request.key_phrase)
        new_staff_data = {
            "institution_id": institution["id"],
            "institution_code": request.institution_code,
            "email": email,
            "hashed_key_phrase": hashed_key,
            "full_name": request.full_name,
            "role": request.role,
            "specialization": request.specialization,
            "employee_id": request.employee_id,
            "is_active": True,
            "created_by": creator_id
        }

        try:
            response = self.db.table("clinical_staff").insert(new_staff_data).execute()
            if not response.data:
                raise DatabaseException("DB insertion failed to return staff record.")
            
            new_staff = response.data[0]
            await self._log_auth_audit(
                action="account_created",
                staff_id=new_staff["id"],
                institution_id=institution["id"],
                institution_code=request.institution_code,
                email=email,
                metadata={"created_by": creator_id, "role": request.role}
            )

            return StaffProfile(
                id=str(new_staff["id"]),
                email=new_staff["email"],
                full_name=new_staff["full_name"],
                role=new_staff["role"],
                specialization=new_staff.get("specialization"),
                institution_name=institution["institution_name"],
                institution_code=request.institution_code,
                last_login_at=None,
                login_count=0
            )
        except Exception as e:
            logger.error("DB error creating clinical staff record", error=str(e))
            raise DatabaseException(f"Failed to write staff account: {str(e)}")

    async def deactivate_staff(self, staff_id: str, deactivated_by_id: str, deactivator_role: str, deactivator_inst_id: str) -> None:
        """Deactivates a staff member and revokes all active login sessions."""
        if deactivator_role not in ["admin", "superadmin"]:
            raise ForbiddenException("Only administrators can deactivate clinical staff.")

        if staff_id == deactivated_by_id:
            raise ForbiddenException("Administrators cannot deactivate their own accounts.")

        # Find target staff profile
        staff_res = self.db.table("clinical_staff").select("*").eq("id", staff_id).execute()
        if not staff_res.data:
            raise ForbiddenException("Clinical staff account not found.")

        target_staff = staff_res.data[0]
        if deactivator_role == "admin" and str(target_staff["institution_id"]) != str(deactivator_inst_id):
            raise ForbiddenException("Administrators can only deactivate staff within their own institution.")

        # Execute deactivation
        try:
            self.db.table("clinical_staff")\
                .update({
                    "is_active": False,
                    "deactivated_at": datetime.utcnow().isoformat(),
                    "deactivated_by": deactivated_by_id
                })\
                .eq("id", staff_id)\
                .execute()

            # Revoke all active sessions
            self.db.table("auth_sessions")\
                .update({"is_active": False, "revoked_at": datetime.utcnow().isoformat()})\
                .eq("staff_id", staff_id)\
                .execute()

            await self._log_auth_audit(
                action="account_deactivated",
                staff_id=staff_id,
                institution_id=target_staff["institution_id"],
                institution_code=target_staff["institution_code"],
                email=target_staff["email"],
                metadata={"deactivated_by": deactivated_by_id}
            )
        except Exception as e:
            logger.error("DB error deactivating staff account", error=str(e))
            raise DatabaseException(f"Failed to update staff status: {str(e)}")

    async def reactivate_staff(self, staff_id: str, reactivated_by_id: str, role: str, inst_id: str) -> None:
        """Reactivates a deactivated staff member."""
        if role not in ["admin", "superadmin"]:
            raise ForbiddenException("Only administrators can reactivate clinical staff.")

        staff_res = self.db.table("clinical_staff").select("*").eq("id", staff_id).execute()
        if not staff_res.data:
            raise ForbiddenException("Clinical staff account not found.")

        target_staff = staff_res.data[0]
        if role == "admin" and str(target_staff["institution_id"]) != str(inst_id):
            raise ForbiddenException("Administrators can only reactivate staff within their own institution.")

        try:
            self.db.table("clinical_staff")\
                .update({
                    "is_active": True,
                    "deactivated_at": None,
                    "deactivated_by": None
                })\
                .eq("id", staff_id)\
                .execute()

            await self._log_auth_audit(
                action="account_reactivated",
                staff_id=staff_id,
                institution_id=target_staff["institution_id"],
                institution_code=target_staff["institution_code"],
                email=target_staff["email"],
                metadata={"reactivated_by": reactivated_by_id}
            )
        except Exception as e:
            logger.error("DB error reactivating staff account", error=str(e))
            raise DatabaseException(f"Failed to reactivate staff status: {str(e)}")

    async def create_institution(self, request: CreateInstitutionRequest, superadmin_id: str) -> dict:
        """Creates a new institution tenant and seeds its first administrative account."""
        # Find superadmin profile
        admin_res = self.db.table("clinical_staff").select("role").eq("id", superadmin_id).execute()
        if not admin_res.data or admin_res.data[0]["role"] != "superadmin":
            raise ForbiddenException("Only superadmin accounts can establish new institutions.")

        # Check unique code
        code = request.institution_code.upper().strip()
        existing = self.db.table("institutions").select("id").eq("institution_code", code).execute()
        if existing.data:
            raise ForbiddenException("An institution with this unique code is already registered.")

        # Insert institution
        inst_payload = {
            "institution_code": code,
            "institution_name": request.institution_name,
            "institution_type": request.institution_type,
            "city": request.city,
            "state": request.state,
            "max_staff_accounts": request.max_staff_accounts,
            "created_by": superadmin_id
        }

        try:
            inst_response = self.db.table("institutions").insert(inst_payload).execute()
            if not inst_response.data:
                raise DatabaseException("Failed to insert institution record.")
            
            institution = inst_response.data[0]
            institution_id = institution["id"]

            # Create first admin account
            admin_email = request.first_admin_email.lower().strip()
            hashed_key = hash_password(request.first_admin_key_phrase)
            
            admin_payload = {
                "institution_id": institution_id,
                "institution_code": code,
                "email": admin_email,
                "hashed_key_phrase": hashed_key,
                "full_name": request.first_admin_name,
                "role": "admin",
                "is_active": True,
                "created_by": superadmin_id
            }

            admin_response = self.db.table("clinical_staff").insert(admin_payload).execute()
            if not admin_response.data:
                raise DatabaseException("Institution created but failed to create first admin account.")

            admin_account = admin_response.data[0]

            await self._log_auth_audit(
                action="account_created",
                staff_id=admin_account["id"],
                institution_id=institution_id,
                institution_code=code,
                email=admin_email,
                metadata={"created_by": superadmin_id, "notes": "First admin for new institution"}
            )

            return {
                "institution_id": str(institution_id),
                "institution_code": code,
                "institution_name": request.institution_name,
                "admin_id": str(admin_account["id"]),
                "admin_email": admin_email
            }
        except Exception as e:
            logger.error("DB error establishing new institution", error=str(e))
            raise DatabaseException(f"Failed to create new institution tenant: {str(e)}")

    async def get_auth_audit_log(self, institution_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Queries the auth_audit_log table for historical events under the institution."""
        try:
            res = self.db.table("auth_audit_log")\
                .select("*")\
                .eq("institution_id", institution_id)\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            return res.data or []
        except Exception as e:
            logger.error("Failed to query auth audit logs", institution_id=institution_id, error=str(e))
            raise DatabaseException(f"Failed to query audit trail: {str(e)}")
