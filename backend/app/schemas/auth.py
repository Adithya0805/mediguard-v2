from typing import Optional
from pydantic import BaseModel, Field, EmailStr, validator


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Clinical Email Address")
    key_phrase: str = Field(..., min_length=8, description="Clinical Key Phrase / Password")
    institution_code: str = Field(..., min_length=3, description="Unique Institution Code")

    @validator("institution_code")
    def uppercase_institution_code(cls, v):
        return v.upper().strip()


class LoginResponse(BaseModel):
    access_token: str = Field(..., description="Signed JWT Bearer Token")
    token_type: str = Field("bearer", description="Type of token")
    expires_in: int = Field(28800, description="Expiration time in seconds (8 hours)")
    staff_id: str = Field(..., description="Unique ID of clinical staff member")
    full_name: str = Field(..., description="Full name of clinical staff member")
    role: str = Field(..., description="Role profile of clinical staff member")
    institution_name: str = Field(..., description="Assigned institution name")
    institution_code: str = Field(..., description="Assigned institution code")


class StaffProfile(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    specialization: Optional[str] = None
    institution_name: str
    institution_code: str
    last_login_at: Optional[str] = None
    login_count: int


class CreateStaffRequest(BaseModel):
    email: EmailStr = Field(..., description="Clinical Email Address")
    full_name: str = Field(..., description="Full Name of clinical staff member")
    role: str = Field(..., description="Staff role (physician, nurse, pharmacist, admin)")
    key_phrase: str = Field(..., min_length=12, description="Temp key phrase (min 12 chars)")
    specialization: Optional[str] = Field(None, description="Clinical Specialization")
    employee_id: Optional[str] = Field(None, description="Hospital Employee ID")
    institution_code: str = Field(..., description="Admin's Institution Code")

    @validator("role")
    def validate_role(cls, v):
        allowed = ["physician", "nurse", "pharmacist", "admin"]
        if v not in allowed:
            raise ValueError(f"Role must be one of {allowed}")
        return v

    @validator("institution_code")
    def uppercase_code(cls, v):
        return v.upper().strip()


class CreateInstitutionRequest(BaseModel):
    institution_code: str = Field(..., min_length=3)
    institution_name: str = Field(...)
    institution_type: str = Field(...)
    city: str = Field(...)
    state: str = Field(...)
    max_staff_accounts: int = Field(default=50, ge=1)
    first_admin_email: EmailStr = Field(...)
    first_admin_name: str = Field(...)
    first_admin_key_phrase: str = Field(..., min_length=12)

    @validator("institution_code")
    def uppercase_code(cls, v):
        return v.upper().strip()

    @validator("institution_type")
    def validate_type(cls, v):
        allowed = ["hospital", "clinic", "diagnostic_center", "research"]
        if v not in allowed:
            raise ValueError(f"Type must be one of {allowed}")
        return v


class TokenData(BaseModel):
    staff_id: str
    institution_id: str
    institution_code: str
    role: str
    exp: int
