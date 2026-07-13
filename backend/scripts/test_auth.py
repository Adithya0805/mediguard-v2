import os
import sys

# Add parent directory to sys.path to resolve imports correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Force mock mode for offline test execution
os.environ["SUPABASE_URL"] = "mock"
os.environ["SUPABASE_KEY"] = "mock"

from app.db.supabase_client import get_supabase_client
from app.services.auth_service import AuthService, hash_password, verify_password
from app.schemas.auth import CreateStaffRequest, CreateInstitutionRequest
from app.utils.exceptions import AuthenticationException, ForbiddenException


async def run_auth_tests():
    print("=========================================================")
    print("    MEDIGUARD V2 - CLINICAL AUTHENTICATION TEST SUITE")
    print("=========================================================")

    # Initialize Client and Service
    db = get_supabase_client()
    auth_service = AuthService(db)

    # Clean mock DB structure
    from app.db.supabase_client import _mock_db
    _mock_db["institutions"] = []
    _mock_db["clinical_staff"] = [{
        "id": "mock-superadmin",
        "email": "superadmin@mediguard.ai",
        "hashed_key_phrase": "dummy",
        "full_name": "Super Admin",
        "role": "superadmin",
        "is_active": True
    }]
    _mock_db["auth_audit_log"] = []
    _mock_db["auth_sessions"] = []

    print("\n[TEST 1] Hashing and Verification functions")
    keyphrase = "MySecureClinicalPassphrase2026!"
    hashed = hash_password(keyphrase)
    assert hashed != keyphrase, "Hash must not equal plain text"
    assert verify_password(keyphrase, hashed) is True, "Valid passphrase must verify"
    assert verify_password("wrongphrase", hashed) is False, "Invalid passphrase must fail"
    print("  [PASS] Hash & verify match perfectly.")

    print("\n[TEST 2] Seed Tenant Institution and Admin Profile")
    inst_req = CreateInstitutionRequest(
        institution_code="TEST-HOSP-001",
        institution_name="Test General Hospital",
        institution_type="hospital",
        city="Boston",
        state="MA",
        max_staff_accounts=3,
        first_admin_email="admin@testhosp.com",
        first_admin_name="Dr. Jane Admin",
        first_admin_key_phrase="JaneAdminPassphrase123!"
    )
    
    inst_res = await auth_service.create_institution(inst_req, superadmin_id="mock-superadmin")
    assert inst_res["institution_code"] == "TEST-HOSP-001"
    inst_id = inst_res["institution_id"]
    admin_id = inst_res["admin_id"]
    
    # Check that both the institution and clinical staff exist in mock DB
    assert len(_mock_db["institutions"]) == 1, "Institution table should have 1 record"
    assert len(_mock_db["clinical_staff"]) == 2, "Staff table should have 2 records (1 superadmin, 1 admin)"
    assert _mock_db["clinical_staff"][1]["role"] == "admin"
    print("  [PASS] Seed tenant structure created successfully.")

    print("\n[TEST 3] Login verification with JWT token generation")
    # Test wrong key phrase
    try:
        await auth_service.authenticate_staff(
            email="admin@testhosp.com",
            key_phrase="wrongphrase",
            institution_code="TEST-HOSP-001",
            ip_address="127.0.0.1",
            user_agent="PyTest"
        )
        raise AssertionError("Login should have failed with wrong keyphrase")
    except AuthenticationException:
        print("  [PASS] Invalid password rejected correctly.")

    # Test wrong institution code
    try:
        await auth_service.authenticate_staff(
            email="admin@testhosp.com",
            key_phrase="JaneAdminPassphrase123!",
            institution_code="WRONG-CODE",
            ip_address="127.0.0.1",
            user_agent="PyTest"
        )
        raise AssertionError("Login should have failed with wrong institution code")
    except AuthenticationException:
        print("  [PASS] Invalid institution code rejected correctly.")

    # Test successful login
    login_res = await auth_service.authenticate_staff(
        email="admin@testhosp.com",
        key_phrase="JaneAdminPassphrase123!",
        institution_code="TEST-HOSP-001",
        ip_address="127.0.0.1",
        user_agent="PyTest"
    )
    
    assert login_res.access_token is not None
    assert login_res.role == "admin"
    assert login_res.institution_code == "TEST-HOSP-001"
    print("  [PASS] Login successful, JWT token and cookies payload generated.")

    print("\n[TEST 4] Token validation & payload extraction")
    token_data = await auth_service.verify_token(login_res.access_token)
    assert token_data.role == "admin"
    assert token_data.institution_code == "TEST-HOSP-001"
    print("  [PASS] Profile matches decoded token payload.")

    print("\n[TEST 5] Enroll Clinical Staff under tenant limit")
    # Jane Admin creates a physician
    physician_req = CreateStaffRequest(
        email="physician@testhosp.com",
        full_name="Dr. Bob Physician",
        role="physician",
        key_phrase="BobPhysicianPassphrase456!",
        specialization="Cardiology",
        employee_id="EMP-11223",
        institution_code="TEST-HOSP-001"
    )
    
    new_staff = await auth_service.create_staff(physician_req, creator_role="admin", creator_inst_code="TEST-HOSP-001", creator_id=admin_id)
    assert new_staff.email == "physician@testhosp.com"
    assert new_staff.role == "physician"
    
    # Jane Admin creates a nurse
    nurse_req = CreateStaffRequest(
        email="nurse@testhosp.com",
        full_name="Nurse Alice",
        role="nurse",
        key_phrase="NurseAlicePassphrase789!",
        specialization=None,
        employee_id="EMP-44556",
        institution_code="TEST-HOSP-001"
    )
    await auth_service.create_staff(nurse_req, creator_role="admin", creator_inst_code="TEST-HOSP-001", creator_id=admin_id)
    
    # Try exceeding the quota limit of 3 accounts
    pharmacist_req = CreateStaffRequest(
        email="pharmacist@testhosp.com",
        full_name="Pharmacist Charlie",
        role="pharmacist",
        key_phrase="CharliePassphrase321!",
        specialization=None,
        employee_id="EMP-77889",
        institution_code="TEST-HOSP-001"
    )
    
    try:
        await auth_service.create_staff(pharmacist_req, creator_role="admin", creator_inst_code="TEST-HOSP-001", creator_id=admin_id)
        raise AssertionError("Staff enrollment should have failed due to quota limit")
    except ForbiddenException:
        print("  [PASS] Quota limit restriction triggered correctly.")

    print("\n[TEST 6] Deactivation and Reactivation of accounts")
    # Deactivate Bob
    bob_id = new_staff.id
    await auth_service.deactivate_staff(staff_id=bob_id, deactivated_by_id=admin_id, deactivator_role="admin", deactivator_inst_id=inst_id)
    
    # Try logging in with deactivated Bob
    try:
        await auth_service.authenticate_staff(
            email="physician@testhosp.com",
            key_phrase="BobPhysicianPassphrase456!",
            institution_code="TEST-HOSP-001",
            ip_address="127.0.0.1",
            user_agent="PyTest"
        )
        raise AssertionError("Login should have failed for deactivated staff member")
    except AuthenticationException as e:
        assert "inactive" in str(e).lower()
        print("  [PASS] Login blocked for deactivated accounts.")

    # Reactivate Bob
    await auth_service.reactivate_staff(staff_id=bob_id, reactivated_by_id=admin_id, role="admin", inst_id=inst_id)
    bob_login = await auth_service.authenticate_staff(
        email="physician@testhosp.com",
        key_phrase="BobPhysicianPassphrase456!",
        institution_code="TEST-HOSP-001",
        ip_address="127.0.0.1",
        user_agent="PyTest"
    )
    assert bob_login.access_token is not None
    print("  [PASS] Account reactivated successfully.")

    print("\n[TEST 7] Audit Trails Logging")
    logs = await auth_service.get_auth_audit_log(institution_id=inst_id, limit=10)
    assert len(logs) >= 5, f"Expected audit logs, got {len(logs)}"
    actions = [l["action"] for l in logs]
    assert "login_success" in actions
    assert "login_failed" in actions
    assert "account_created" in actions
    print("  [PASS] Complete HIPAA access audit history generated.")

    print("\n=========================================================")
    print("  SUCCESS: ALL 7 CLINICAL AUTHENTICATION TESTS PASSED!")
    print("=========================================================")


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_auth_tests())
