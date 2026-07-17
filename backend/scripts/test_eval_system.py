import os
import sys
import json
import subprocess
import asyncio

# Add parent directory to path so imports work correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from deepeval.test_case import LLMTestCase


def print_step(name, status, details=""):
    symbol = "✅ PASS" if status else "❌ FAIL"
    print(f"[{symbol}] Step: {name} | {details}")


def run_diagnostics():
    print("=" * 70)
    print("   MEDIGUARD V2 — EVALUATION SYSTEM DIAGNOSTICS")
    print("=" * 70)
    
    # Step 1: Import all eval modules
    try:
        from evals.test_cases.clinical_cases import CLINICAL_TEST_CASES, SAFETY_CRITICAL_CASES
        from evals.metrics.clinical_metrics import (
            DiagnosisAccuracyMetric,
            UrgencyCalibrationMetric,
            ClinicalSafetyMetric,
            DDxCompletenessMetric,
            DrugSafetyMetric,
            HallucinationGuardMetric
        )
        from evals.mock_responses import MockAgentResponses
        from evals.evaluators.agent_evaluator import ClinicalAgentEvaluator
        print_step("Import eval modules", True)
    except Exception as e:
        print_step("Import eval modules", False, str(e))
        sys.exit(1)

    # Step 2: Load CLINICAL_TEST_CASES
    try:
        count = len(CLINICAL_TEST_CASES)
        status = count == 20
        print_step("Load CLINICAL_TEST_CASES", status, f"Found {count} cases (expected 20)")
        if not status:
            sys.exit(1)
    except Exception as e:
        print_step("Load CLINICAL_TEST_CASES", False, str(e))
        sys.exit(1)

    # Step 3: Verify required fields in all 20 cases
    try:
        missing = []
        required = ["case_id", "input", "expected", "safety_class"]
        for case in CLINICAL_TEST_CASES:
            for req in required:
                if req not in case:
                    missing.append(f"{case.get('case_id', 'unknown')}:{req}")
        status = len(missing) == 0
        print_step("Verify required fields", status, f"Missing: {missing}" if missing else "All fields present")
        if not status:
            sys.exit(1)
    except Exception as e:
        print_step("Verify required fields", False, str(e))
        sys.exit(1)

    # Step 4: Run MockAgentResponses on TC-001 (STEMI)
    try:
        mock = MockAgentResponses()
        stemi_case = next(c for c in CLINICAL_TEST_CASES if c["case_id"] == "TC-001")
        intake = mock.get_intake_response(stemi_case["input"])
        symptoms = intake.get("symptoms", [])
        sym_analysis = mock.get_symptom_response(symptoms)
        diag = mock.get_diagnosis_response(symptoms, [], "TC-001")
        drugs = mock.get_drug_response(intake.get("current_medications", []), "TC-001")
        
        simulated_state = {
            "patient_data": stemi_case["input"],
            "primary_diagnosis": diag["primary_diagnosis"],
            "urgency_level": diag["urgency_level"]
        }
        report = mock.get_report_response(simulated_state, "TC-001")

        # Verify structure
        has_summary = "executive_summary" in report
        has_disclaimers = len(report.get("clinical_disclaimers", [])) >= 3
        status = has_summary and has_disclaimers
        print_step("Mock responses TC-001", status, f"Summary present: {has_summary}, Disclaimers count: {len(report.get('clinical_disclaimers', []))}")
        if not status:
            sys.exit(1)
    except Exception as e:
        print_step("Mock responses TC-001", False, str(e))
        sys.exit(1)

    # Step 5: Run DiagnosisAccuracyMetric
    try:
        metric = DiagnosisAccuracyMetric()
        score = metric.measure(LLMTestCase(
            input=json.dumps(stemi_case["input"]),
            actual_output=diag["primary_diagnosis"]["diagnosis"],
            expected_output=stemi_case["expected"]["primary_diagnosis_contains"]
        ))
        status = 0.0 <= score <= 1.0 and metric.success
        print_step("DiagnosisAccuracyMetric check", status, f"Score: {score}, Success: {metric.success}")
        if not status:
            sys.exit(1)
    except Exception as e:
        print_step("DiagnosisAccuracyMetric check", False, str(e))
        sys.exit(1)

    # Step 6: Run UrgencyCalibrationMetric
    try:
        metric = UrgencyCalibrationMetric()
        score = metric.measure(LLMTestCase(
            input=json.dumps(stemi_case["input"]),
            actual_output=diag["urgency_level"],
            expected_output=stemi_case["expected"]["urgency_level"],
            additional_metadata={"safety_class": stemi_case["safety_class"]}
        ))
        status = 0.0 <= score <= 1.0 and metric.success
        print_step("UrgencyCalibrationMetric check", status, f"Score: {score}, Success: {metric.success}")
        if not status:
            sys.exit(1)
    except Exception as e:
        print_step("UrgencyCalibrationMetric check", False, str(e))
        sys.exit(1)

    # Step 7: Run ClinicalSafetyMetric
    try:
        metric = ClinicalSafetyMetric()
        score = metric.measure(LLMTestCase(
            input=json.dumps(stemi_case["input"]),
            actual_output=json.dumps(report),
            expected_output=""
        ))
        status = 0.0 <= score <= 1.0 and metric.success
        print_step("ClinicalSafetyMetric check", status, f"Score: {score}, Success: {metric.success}")
        if not status:
            sys.exit(1)
    except Exception as e:
        print_step("ClinicalSafetyMetric check", False, str(e))
        sys.exit(1)

    # Step 8: Run full evaluator on 3 cases (mock mode)
    try:
        evaluator = ClinicalAgentEvaluator(use_mock_llm=True)
        report_data = evaluator.logger.info("Executing evaluation on first 3 cases...") or True
        
        # Run sequentially on the first 3 cases
        three_cases = CLINICAL_TEST_CASES[:3]
        
        # Run asyncio helper
        loop = asyncio.get_event_loop()
        report_data = loop.run_until_complete(evaluator.run_all_cases(cases=three_cases))
        
        has_rec = "deployment_recommendation" in report_data
        has_results = len(report_data.get("results", [])) == 3
        status = has_rec and has_results
        print_step("Run evaluator on 3 cases", status, f"Recommendation: {report_data.get('deployment_recommendation')}, Results count: {len(report_data.get('results', []))}")
        if not status:
            sys.exit(1)
    except Exception as e:
        print_step("Run evaluator on 3 cases", False, str(e))
        sys.exit(1)

    # Step 9: Generate safety report text
    try:
        report_text = evaluator.generate_safety_report(report_data)
        status = "MEDIGUARD V2" in report_text and "SUMMARY STATISTICS" in report_text
        print_step("Generate safety report text", status, f"Contains 'MEDIGUARD V2': {'MEDIGUARD V2' in report_text}")
        if not status:
            sys.exit(1)
    except Exception as e:
        print_step("Generate safety report text", False, str(e))
        sys.exit(1)

    # Step 10: Run: python evals/run_eval.py --use-mock
    try:
        cmd = [sys.executable, "evals/run_eval.py", "--use-mock"]
        # Run process
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
        status = result.returncode == 0
        print_step("Run run_eval.py CLI check", status, f"Exit code: {result.returncode}")
        if not status:
            print("--- CLI STDOUT ---")
            print(result.stdout)
            print("--- CLI STDERR ---")
            print(result.stderr)
            sys.exit(1)
    except Exception as e:
        print_step("Run run_eval.py CLI check", False, str(e))
        sys.exit(1)

    print("\n" + "=" * 70)
    print("🎉 Diagnostics Complete: Eval System: READY")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    # Force UTF-8 output on Windows to support clean emoji rendering
    if sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
            
    run_diagnostics()
