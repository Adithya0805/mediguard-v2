import asyncio
import sys
import os

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.openfda_client import fda_client

async def run_tests():
    print("="*60)
    print("STARTING OPENFDA INTEGRATION TESTING")
    print("="*60)

    # Test 1: Metformin search
    print("\n[Test 1] Searching for 'metformin' label...")
    label = await fda_client.search_drug_label("metformin")
    if label and "openfda" in label:
        print("  --> PASS: Metformin label found.")
    else:
        print("  --> FAIL: Metformin label not found.")

    # Test 2: Warfarin interactions
    print("\n[Test 2] Fetching interactions for 'warfarin'...")
    warfarin_interactions = await fda_client.get_drug_interactions("warfarin")
    if warfarin_interactions:
        print(f"  --> PASS: Warfarin has {len(warfarin_interactions)} interaction warnings.")
        print("\n=== SAMPLE WARFARIN FDA INTERACTION TEXT ===")
        print(warfarin_interactions[0][:300] + "...")
        print("============================================\n")
    else:
        print("  --> FAIL: No interactions found for warfarin.")

    # Test 3: Aspirin warnings
    print("\n[Test 3] Fetching warnings for 'aspirin'...")
    aspirin_warnings = await fda_client.get_drug_warnings("aspirin")
    if aspirin_warnings:
        print(f"  --> PASS: Aspirin warnings found ({len(aspirin_warnings)} lines).")
    else:
        print("  --> FAIL: No warnings found for aspirin.")

    # Test 4: Check drug pair (warfarin + aspirin)
    print("\n[Test 4] Checking drug pair interaction (warfarin + aspirin)...")
    pair_check = await fda_client.check_drug_pair("warfarin", "aspirin")
    if pair_check.get("interaction_found"):
        print("  --> PASS: Interaction correctly flagged between Warfarin and Aspirin.")
        print("  Relevant warnings matching:")
        for w in pair_check.get("relevant_warnings", []):
            print(f"    - {w[:150]}...")
    else:
        print("  --> FAIL: Interaction NOT flagged between Warfarin and Aspirin.")

    # Test 5: Batch check medications
    print("\n[Test 5] Performing batch check for ['metformin', 'lisinopril', 'aspirin', 'atorvastatin']...")
    meds = ["metformin", "lisinopril", "aspirin", "atorvastatin"]
    batch_result = await fda_client.batch_check_medications(meds)
    pairs_checked = batch_result.get("pairs_checked", 0)
    if pairs_checked == 6:
        print(f"  --> PASS: Correct number of pairs checked (6).")
        found = batch_result.get("interactions_found", [])
        print(f"  Found {len(found)} interactions:")
        for interaction in found:
            print(f"    - {interaction['drug_a']} + {interaction['drug_b']} (FDA Cited)")
    else:
        print(f"  --> FAIL: Checked {pairs_checked} pairs instead of 6.")

    # Test 6: Unknown drug handling
    print("\n[Test 6] Testing fallback with unknown drug 'xyz_fake_drug_123'...")
    try:
        unknown_label = await fda_client.search_drug_label("xyz_fake_drug_123")
        unknown_warns = await fda_client.get_drug_warnings("xyz_fake_drug_123")
        unknown_contras = await fda_client.get_drug_contraindications("xyz_fake_drug_123")
        
        if unknown_label is None and len(unknown_warns) == 0 and len(unknown_contras) == 0:
            print("  --> PASS: Unknown drug handled gracefully without crashing.")
        else:
            print("  --> FAIL: Unexpected returns for unknown drug.")
    except Exception as e:
        print(f"  --> FAIL: Crashed with exception: {e}")

    await fda_client.close()
    print("\n" + "="*60)
    print("OpenFDA Integration: READY")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(run_tests())
