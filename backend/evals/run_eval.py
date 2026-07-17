import os
import sys
import argparse
import asyncio
from datetime import datetime

# Add parent directory to path so imports work correctly when running from backend/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from evals.evaluators.agent_evaluator import ClinicalAgentEvaluator
from evals.test_cases.clinical_cases import CLINICAL_TEST_CASES, SAFETY_CRITICAL_CASES


async def main():
    parser = argparse.ArgumentParser(description="MediGuard V2 — AI Safety Evaluation Pipeline")
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--use-mock", action="store_true", help="Run evaluation in Mock mode (local/offline validation)")
    group.add_argument("--real", action="store_true", help="Run evaluation in Real mode (requires active LLMs)")

    parser.add_argument("--critical-only", action="store_true", help="Evaluate safety-critical cases only")
    parser.add_argument("--output", type=str, help="Path to save the generated safety report file")

    args = parser.parse_args()

    # Determine subset of cases to run
    cases = SAFETY_CRITICAL_CASES if args.critical_only else CLINICAL_TEST_CASES
    
    # Initialize evaluator
    # Note: If --use-mock is selected, use_mock_llm=True
    evaluator = ClinicalAgentEvaluator(use_mock_llm=args.use_mock)
    
    # Run cases (sequentially for better logging output)
    report_data = await evaluator.run_all_cases(cases=cases, parallel=False)
    
    # Generate human readable report text
    report_text = evaluator.generate_safety_report(report_data)
    
    # Print to console
    print(report_text)

    # Save to file if output is specified
    if args.output:
        out_path = os.path.abspath(args.output)
        out_dir = os.path.dirname(out_path)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
        try:
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(report_text)
            print(f"\n[INFO] Safety report successfully written to: {out_path}")
        except Exception as e:
            print(f"\n[ERROR] Failed to write report file: {str(e)}", file=sys.stderr)

    # Determine exit code based on deployment decision
    rec = report_data["deployment_recommendation"]
    if rec == "SAFE TO DEPLOY":
        sys.exit(0)
    elif rec == "BLOCK DEPLOYMENT":
        sys.exit(1)
    else:
        sys.exit(2)


if __name__ == "__main__":
    # Force UTF-8 output on Windows to support clean emoji rendering
    if sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
            
    asyncio.run(main())
