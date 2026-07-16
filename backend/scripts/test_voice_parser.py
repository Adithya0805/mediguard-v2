"""
MediGuard V2 — Voice Parser Test Script
Day 6: Validates clinical NLP extraction with 5 real-world transcripts

Run from backend/:
    .venv/Scripts/python.exe scripts/test_voice_parser.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.voice_parser import ClinicalVoiceParser


# ── Test Transcripts ──────────────────────────────────────────────────────────

TESTS = [
    {
        "name": "T1 — Emergency Cardiac Case",
        "transcript": (
            "Okay so this is a 62 year old gentleman, John Thomas, came in about 30 minutes ago "
            "with really bad chest pain, been going on for about an hour, the pain is going down "
            "his left arm as well and he's sweating quite a bit, feeling sick too, he said he's had "
            "a heart attack before about 5 years ago, he's on aspirin, atorvastatin and metoprolol, "
            "no known allergies, blood pressure's 170 over 100 and his heart rate is 110"
        ),
        "expect": {
            "patient_age": 62,
            "patient_gender": "male",
            "symptoms_contains": ["chest pain"],
            "meds_contain": ["aspirin"],
            "bp_non_empty": True,
            "red_flag": True,
        },
    },
    {
        "name": "T2 — Pediatric Fever with Red Flag",
        "transcript": (
            "Little girl, around 8 years old, mum says she's had fever since yesterday, "
            "temperature was 39.5 at home, she's got a headache and a rash on her arms, "
            "seems confused and the mum is very worried, no past history, "
            "no medications, no allergies mentioned"
        ),
        "expect": {
            "patient_age": 8,
            "patient_gender": "female",
            "symptoms_contains": ["fever"],
            "red_flag": True,
        },
    },
    {
        "name": "T3 — Informal Language / Alias Conversion",
        "transcript": (
            "Patient can't breathe properly, been throwing up since morning, stomach's killing "
            "her, she's dizzy and her heart's been racing, she's a diabetic and takes metformin, "
            "she's about 45 and female"
        ),
        "expect": {
            "patient_age": 45,
            "patient_gender": "female",
            "symptoms_any_of": ["dyspnea", "vomiting", "dizziness", "palpitations", "abdominal pain", "nausea"],
            "meds_contain": ["metformin"],
        },
    },
    {
        "name": "T4 — Minimal Information",
        "transcript": "Young man with back pain",
        "expect": {
            "confidence_lt": 0.4,
            "has_missing_fields": True,
        },
    },
    {
        "name": "T5 — All Fields Present",
        "transcript": (
            "Patient name is Ravi Kumar, 58 year old male, chief complaint is severe headache "
            "with visual disturbances for 2 days, symptoms include headache, blurred vision, "
            "nausea, history of hypertension and migraine, medications amlodipine 5mg and "
            "sumatriptan 50mg as needed, allergic to NSAIDs, blood pressure 182 over 110, "
            "heart rate 88, temperature 37.4, oxygen saturation 98 percent, weight 62 kilos, "
            "height 163 centimeters"
        ),
        "expect": {
            "patient_name_non_empty": True,
            "patient_age": 58,
            "patient_gender": "male",
            "confidence_gt": 0.7,
            "vitals_bp_non_empty": True,
        },
    },
]


# ── Test Runner ───────────────────────────────────────────────────────────────

def _check(result: dict, expect: dict, name: str) -> tuple[bool, list[str]]:
    """Check result dict against expectations. Returns (passed, issues)."""
    issues: list[str] = []

    age = expect.get("patient_age")
    if age is not None and result.get("patient_age") != age:
        issues.append(f"age: expected {age}, got {result.get('patient_age')}")

    gender = expect.get("patient_gender")
    if gender and result.get("patient_gender", "").lower() != gender:
        issues.append(f"gender: expected {gender}, got {result.get('patient_gender')}")

    name_check = expect.get("patient_name_non_empty")
    if name_check and not result.get("patient_name", "").strip():
        issues.append("patient_name: expected non-empty")

    symptoms: list[str] = [s.lower() for s in result.get("symptoms", [])]
    for sym in expect.get("symptoms_contains", []):
        if not any(sym.lower() in s for s in symptoms):
            issues.append(f"symptoms: missing '{sym}'")

    any_of = expect.get("symptoms_any_of", [])
    if any_of:
        found = any(any(a.lower() in s for s in symptoms) for a in any_of)
        if not found:
            issues.append(f"symptoms: expected at least one of {any_of}")

    meds: list[str] = [m.lower() for m in result.get("current_medications", [])]
    for med in expect.get("meds_contain", []):
        if not any(med.lower() in m for m in meds):
            issues.append(f"medications: missing '{med}'")

    bp_check = expect.get("bp_non_empty")
    if bp_check and not result.get("vitals", {}).get("bp", "").strip():
        issues.append("vitals.bp: expected non-empty")

    vitals_bp = expect.get("vitals_bp_non_empty")
    if vitals_bp and not result.get("vitals", {}).get("bp", "").strip():
        issues.append("vitals.bp: expected non-empty")

    conf_lt = expect.get("confidence_lt")
    if conf_lt is not None and result.get("extraction_confidence", 1.0) >= conf_lt:
        issues.append(f"confidence: expected < {conf_lt}, got {result.get('extraction_confidence')}")

    conf_gt = expect.get("confidence_gt")
    if conf_gt is not None and result.get("extraction_confidence", 0.0) <= conf_gt:
        issues.append(f"confidence: expected > {conf_gt}, got {result.get('extraction_confidence')}")

    has_missing = expect.get("has_missing_fields")
    if has_missing and not result.get("fields_missing"):
        issues.append("fields_missing: expected some missing fields to be listed")

    red_flag = expect.get("red_flag")
    if red_flag is True and not result.get("red_flags_detected", False):
        issues.append("red_flags_detected: expected True")

    return len(issues) == 0, issues


async def run_tests():
    parser = ClinicalVoiceParser()
    passed = 0
    total = len(TESTS)

    print("\n" + "=" * 70)
    print("   MediGuard V2 — Voice Parser Test Suite (Day 6)")
    print("=" * 70)

    for test in TESTS:
        transcript = test["transcript"]
        name = test["name"]
        expect = test["expect"]

        print(f"\n🎙️  {name}")
        print(f"   Transcript: '{transcript[:90]}{'...' if len(transcript) > 90 else ''}'")

        try:
            result = await parser.parse_transcript(transcript)
            result = await parser.validate_and_enhance(result, transcript)
        except Exception as e:
            print(f"   ❌ EXCEPTION: {e}")
            continue

        # Summary
        print(f"   Age: {result.get('patient_age')} | "
              f"Gender: {result.get('patient_gender')} | "
              f"Confidence: {result.get('extraction_confidence', 0):.2f}")
        print(f"   Symptoms: {result.get('symptoms', [])}")
        print(f"   Medications: {result.get('current_medications', [])}")
        print(f"   Vitals BP: {result.get('vitals', {}).get('bp')}")
        print(f"   Red Flags: {result.get('red_flags_detected', False)}")
        if result.get("parser_notes"):
            print(f"   Notes: {result.get('parser_notes')[:120]}")

        ok, issues = _check(result, expect, name)
        if ok:
            print(f"   ✅ PASS")
            passed += 1
        else:
            print(f"   ❌ FAIL")
            for issue in issues:
                print(f"      → {issue}")

    print("\n" + "=" * 70)
    print(f"   Voice Parser: {passed}/{total} tests passed")
    print("=" * 70 + "\n")

    if passed >= 4:
        print("✅ Day 6 voice parser meets definition of done (≥ 4/5 passing)")
    else:
        print("⚠️  Parser needs improvement — fewer than 4/5 tests passing")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_tests())
