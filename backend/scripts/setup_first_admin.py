import os
import sys
import re

# Add parent directory to sys.path to resolve imports correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.supabase_client import get_supabase_client
from app.services.auth_service import hash_password


def get_input(prompt: str, validator=None, error_msg: str = "Invalid input.") -> str:
    """Helper to get and validate user CLI inputs."""
    while True:
        value = input(prompt).strip()
        if not value:
            print("  [WARNING] Field cannot be empty. Please enter a value.")
            continue
        if validator and not validator(value):
            print(f"  [WARNING] {error_msg}")
            continue
        return value


def validate_email(email: str) -> bool:
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))


def main():
    print("=============================================================================")
    print("                MEDIGUARD V2 - CLINICAL TENANT SETUP UTILITY")
    print("=============================================================================")
    print("This utility configures the initial institution tenant and seeds the first")
    print("administrator staff account. Ensure your Supabase backend credentials in")
    print(".env are correct before proceeding.")
    print("-----------------------------------------------------------------------------\n")

    # 1. Institution Details
    code = get_input(
        "Institution Code (e.g. APOLLO-CHN-001): ",
        validator=lambda x: len(x) >= 3,
        error_msg="Institution Code must be at least 3 characters long."
    ).upper()

    name = get_input("Institution Name: ")

    type_options = ["hospital", "clinic", "diagnostic_center", "research"]
    inst_type = get_input(
        f"Institution Type {type_options}: ",
        validator=lambda x: x.lower() in type_options,
        error_msg=f"Type must be one of {type_options}."
    ).lower()

    city = get_input("City: ")
    state = get_input("State: ")

    # 2. First Admin Details
    admin_name = get_input("Admin Full Name: ")
    
    admin_email = get_input(
        "Admin Email: ",
        validator=validate_email,
        error_msg="Please enter a valid clinical email address format."
    ).lower()

    while True:
        keyphrase = input("Admin Key Phrase (min 12 chars): ")
        if len(keyphrase) < 12:
            print("  [WARNING] Key phrase is too short. Minimum 12 characters required for administration safety.")
            continue
        confirm = input("Confirm Key Phrase: ")
        if keyphrase != confirm:
            print("  [WARNING] Key phrases do not match. Please try again.")
            continue
        break

    print("\n-----------------------------------------------------------------------------")
    print("Registering details in Supabase database...")

    try:
        db = get_supabase_client()
        
        # Hash credentials
        hashed_key = hash_password(keyphrase)

        # A. Register Institution
        inst_payload = {
            "institution_code": code,
            "institution_name": name,
            "institution_type": inst_type,
            "city": city,
            "state": state,
            "max_staff_accounts": 50,
            "created_by": "superadmin"
        }
        
        # Check conflict
        existing_inst = db.table("institutions").select("id").eq("institution_code", code).execute()
        if existing_inst.data:
            print(f"  [WARNING] Institution with code '{code}' already registered. Seeding admin account to existing record.")
            inst_id = existing_inst.data[0]["id"]
        else:
            inst_res = db.table("institutions").insert(inst_payload).execute()
            if not inst_res.data:
                print("  [FAIL] Failed to write institution details to Supabase.")
                sys.exit(1)
            inst_id = inst_res.data[0]["id"]
            print("  [PASS] Institution registered successfully.")

        # B. Register Admin Staff Account
        staff_payload = {
            "institution_id": inst_id,
            "institution_code": code,
            "email": admin_email,
            "hashed_key_phrase": hashed_key,
            "full_name": admin_name,
            "role": "admin",
            "is_active": True
        }

        # Check conflict
        existing_staff = db.table("clinical_staff").select("id").eq("email", admin_email).execute()
        if existing_staff.data:
            print(f"  [WARNING] Staff member with email '{admin_email}' is already enrolled.")
        else:
            staff_res = db.table("clinical_staff").insert(staff_payload).execute()
            if not staff_res.data:
                print("  [FAIL] Failed to seed administrator staff profile.")
                sys.exit(1)
            print("  [PASS] Administrator staff account seeded successfully.")

            # Log audit trail action
            audit_payload = {
                "action": "account_created",
                "staff_id": staff_res.data[0]["id"],
                "institution_id": inst_id,
                "institution_code": code,
                "email": admin_email,
                "metadata": {"notes": "First admin set via setup CLI utility"}
            }
            db.table("auth_audit_log").insert(audit_payload).execute()

        # Print visual result
        print("\n=========================================================")
        print("  MediGuard V2 - Institution Created")
        print("=========================================================")
        print(f"  Institution: {name}")
        print(f"  Code:        {code}")
        print(f"  Admin Email: {admin_email}")
        print(f"  Role:        admin")
        print("  -------------------------------------------------------")
        print("  Login at: https://mediguard-v2.vercel.app/login")
        print(f"  Institution Code: {code}")
        print("=========================================================")
        print("  IMPORTANT: Save these credentials securely.\n")

    except Exception as e:
        print(f"\n  [FAIL] Critical database connection failure: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
