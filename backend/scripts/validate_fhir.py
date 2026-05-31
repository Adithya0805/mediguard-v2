import sys
import io
import json
import asyncio

# Reconfigure stdout to use UTF-8 encoding to prevent Windows charmap crash
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.db.supabase_client import get_supabase_client
from app.services.fhir_service import FHIRBundleGenerator

async def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/validate_fhir.py <session_id>")
        sys.exit(1)
        
    session_id = sys.argv[1]
    print(f"[+] Fetching FHIR bundle for Session ID: {session_id} ...")
    
    db = get_supabase_client()
    try:
        response = db.table("clinical_reports").select("fhir_bundle").eq("session_id", session_id).execute()
        if not response.data or not response.data[0].get("fhir_bundle"):
            print(f"[-] No clinical report or FHIR bundle found in database for Session ID '{session_id}'.")
            sys.exit(1)
            
        bundle = response.data[0]["fhir_bundle"]
    except Exception as e:
        print(f"[-] Database query failed: {str(e)}")
        sys.exit(1)
        
    # Run validation
    generator = FHIRBundleGenerator()
    is_valid, issues = generator.validate_bundle(bundle)
    
    print("\n" + "="*80)
    print("FHIR BUNDLE RESOURCE INVENTORY")
    print("="*80)
    
    entries = bundle.get("entry", [])
    for idx, entry in enumerate(entries):
        res = entry.get("resource", {})
        res_type = res.get("resourceType", "Unknown")
        res_id = res.get("id", "Unknown")
        
        # Basic check for item validity
        res_issues = []
        if not res.get("resourceType"):
            res_issues.append("Missing resourceType")
        if not res.get("id"):
            res_issues.append("Missing id")
            
        if res_issues:
            status_text = f"FAIL (Issues: {', '.join(res_issues)})"
        else:
            status_text = "PASS"
            
        print(f"Entry {idx+1:02d} | Resource: {res_type:<20} | ID: {res_id:<30} | Status: [{status_text}]")
        
    print("\n" + "="*80)
    print("OVERALL STRUCTURAL VALIDATION SUMMARY")
    print("="*80)
    if is_valid:
        print("[PASS] Overall Bundle is structurally valid HL7 FHIR R4 standard-compliant document")
    else:
        print(f"[FAIL] Bundle has {len(issues)} structural violations:")
        for idx, issue in enumerate(issues):
            print(f"  {idx+1}. {issue}")
            
    print("\n" + "="*80)
    print("FULL FHIR BUNDLE RAW JSON PLOTS")
    print("="*80)
    print(json.dumps(bundle, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
