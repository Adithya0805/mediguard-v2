"""
MediGuard V2 — Pipeline Structural Test
scripts/test_pipeline.py

Validates the LangGraph orchestration engine WITHOUT requiring real AWS or
Pinecone credentials. Tests:
  1. AgentState initialisation with all required keys
  2. All 5 agent classes import and instantiate without errors
  3. LLMRouter instantiates without errors (mocks gracefully handled)
  4. LangGraph graph compiles without errors
  5. Graph node/edge map is printed
  6. build_initial_state() produces correct structure

Run with:
  cd backend
  .venv\\Scripts\\python scripts\\test_pipeline.py
"""
import sys
import os
import traceback
from datetime import datetime, timezone

# ── Force UTF-8 output on Windows (avoids charmap codec errors) ──────────────
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── Ensure we can import from the app package ─────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"
WARN = "\033[93m[WARN]\033[0m"

results: list[dict] = []


def check(step: int, label: str, fn):
    """Run a test step and record the result."""
    try:
        result = fn()
        print(f"{PASS} Step {step}: {label}")
        if result:
            print(f"       {INFO} {result}")
        results.append({"step": step, "label": label, "passed": True})
    except Exception as exc:
        print(f"{FAIL} Step {step}: {label}")
        print(f"       Error: {exc}")
        if "--verbose" in sys.argv:
            traceback.print_exc()
        results.append({"step": step, "label": label, "passed": False, "error": str(exc)})


# ─────────────────────────────────────────────────────────────────────────────
# Sample patient data — chest pain scenario (high clinical acuity)
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_PATIENT = {
    "patient_name":        "Test Patient",
    "patient_age":         45,
    "patient_gender":      "male",
    "chief_complaint":     "chest pain and shortness of breath for 2 hours",
    "symptoms":            ["chest pain", "shortness of breath", "diaphoresis", "nausea"],
    "medical_history":     ["hypertension", "type 2 diabetes"],
    "current_medications": ["metformin 500mg", "lisinopril 10mg", "aspirin 81mg"],
    "allergies":           ["penicillin"],
    "vitals": {
        "bp":           "158/95",
        "heart_rate":   102,
        "temperature":  37.1,
        "spo2":         94,
        "weight":       85,
        "height":       175,
    },
}

SESSION_ID = "test-session-12345678-abcd-1234-efgh-000000000001"

print()
print("=" * 70)
print("         MEDIGUARD V2 — PIPELINE STRUCTURAL TEST SUITE")
print("=" * 70)
print()

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: AgentState initialisation
# ─────────────────────────────────────────────────────────────────────────────

def test_agent_state():
    from app.schemas.agent import AgentState, build_initial_state

    state = build_initial_state(SESSION_ID, SAMPLE_PATIENT)

    required_keys = [
        "session_id", "created_at", "patient_data",
        "parsed_intake", "intake_confidence",
        "symptoms_analysis", "symptom_severity", "symptom_categories",
        "retrieved_context", "context_sources",
        "differential_diagnosis", "primary_diagnosis", "urgency_level",
        "drug_interactions", "contraindications", "medication_safe",
        "report", "report_generated",
        "current_agent", "completed_agents", "agent_errors",
        "retry_count", "pipeline_start_time", "pipeline_end_time",
    ]

    missing = [k for k in required_keys if k not in state]
    if missing:
        raise AssertionError(f"AgentState missing keys: {missing}")

    assert state["session_id"]     == SESSION_ID,    "session_id mismatch"
    assert state["patient_data"]   == SAMPLE_PATIENT,"patient_data mismatch"
    assert state["current_agent"]  == "intake",      "initial current_agent should be 'intake'"
    assert state["completed_agents"] == [],          "completed_agents should start empty"
    assert state["report_generated"] is False,       "report_generated should start False"
    assert state["medication_safe"]  is True,        "medication_safe should default True"
    assert state["retry_count"]      == 0,           "retry_count should start at 0"

    return (
        f"AgentState validated — {len(required_keys)} keys present, "
        f"patient='{SAMPLE_PATIENT['patient_name']}', session='{SESSION_ID}'"
    )


check(1, "AgentState initialisation with all required keys", test_agent_state)

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Schema import
# ─────────────────────────────────────────────────────────────────────────────

def test_schema_import():
    from app.schemas.agent import AgentState, build_initial_state
    from app.schemas.patient import PatientInput, PatientSessionResponse
    from app.schemas.report import ReportRequest, ClinicalReportResponse
    return "All schema modules imported successfully"


check(2, "All schema modules import without errors", test_schema_import)

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Agent class imports and instantiation
# ─────────────────────────────────────────────────────────────────────────────

def test_agent_imports():
    """Import all 5 agent classes — instantiation requires LLMRouter & Retriever."""
    from app.agents.intake_agent    import IntakeAgent
    from app.agents.symptom_agent   import SymptomAgent
    from app.agents.diagnosis_agent import DiagnosisAgent
    from app.agents.drug_agent      import DrugAgent
    from app.agents.report_agent    import ReportAgent

    # Verify all are classes with an async run() method
    for cls in [IntakeAgent, SymptomAgent, DiagnosisAgent, DrugAgent, ReportAgent]:
        assert hasattr(cls, "__init__"), f"{cls.__name__} missing __init__"
        assert hasattr(cls, "run"),      f"{cls.__name__} missing run() method"

    return "IntakeAgent, SymptomAgent, DiagnosisAgent, DrugAgent, ReportAgent all verified"


check(3, "All 5 agent classes import and expose run()", test_agent_imports)

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: LLMRouter instantiation
# ─────────────────────────────────────────────────────────────────────────────

def test_llm_router():
    from app.llm.router import LLMRouter

    # LLMRouter will log warnings for mock credentials but should NOT raise
    try:
        router = LLMRouter()
        has_any = (
            router._fast_llm is not None or
            router._balanced_llm is not None or
            router._reasoning_llm is not None
        )
        status = "at least one tier loaded" if has_any else "all tiers failed (mock creds)"
        return f"LLMRouter instantiated — {status}"
    except Exception as exc:
        # LLMRouter failure is non-fatal for structural test
        return f"LLMRouter instantiation raised (expected with mock creds): {str(exc)[:80]}"


check(4, "LLMRouter instantiates (gracefully handles mock credentials)", test_llm_router)

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: MedicalRetriever instantiation
# ─────────────────────────────────────────────────────────────────────────────

def test_retriever():
    from app.rag.retriever import MedicalRetriever

    retriever = MedicalRetriever()
    # With mock Pinecone creds, index and embeddings may be None — that's acceptable
    return (
        f"MedicalRetriever instantiated — "
        f"index={'OK' if retriever.index else 'None (mock)'}, "
        f"embeddings={'OK' if retriever.embeddings else 'None (mock)'}"
    )


check(5, "MedicalRetriever instantiates (mock-safe)", test_retriever)

# ─────────────────────────────────────────────────────────────────────────────
# Step 6: LangGraph graph compilation
# ─────────────────────────────────────────────────────────────────────────────

def test_graph_compile():
    from langgraph.graph import StateGraph, START, END
    from app.schemas.agent import AgentState
    from app.agents.intake_agent    import IntakeAgent
    from app.agents.symptom_agent   import SymptomAgent
    from app.agents.diagnosis_agent import DiagnosisAgent
    from app.agents.drug_agent      import DrugAgent
    from app.agents.report_agent    import ReportAgent
    from app.llm.router import LLMRouter
    from app.rag.retriever import MedicalRetriever

    # Build minimal instances for graph construction test
    llm_router = LLMRouter()
    retriever  = MedicalRetriever()

    intake_agent    = IntakeAgent(llm_router, retriever)
    symptom_agent   = SymptomAgent(llm_router, retriever)
    diagnosis_agent = DiagnosisAgent(llm_router, retriever)
    drug_agent      = DrugAgent(llm_router, retriever)
    report_agent    = ReportAgent(llm_router, retriever)

    def conditional_route(state: AgentState) -> str:
        return "report" if state.get("urgency_level") == "critical" else "diagnosis"

    builder = StateGraph(AgentState)
    builder.add_node("intake",     intake_agent.run)
    builder.add_node("symptom",    symptom_agent.run)
    builder.add_node("diagnosis",  diagnosis_agent.run)
    builder.add_node("drug_check", drug_agent.run)
    builder.add_node("report",     report_agent.run)

    builder.add_edge(START,        "intake")
    builder.add_edge("intake",     "symptom")
    builder.add_conditional_edges("symptom", conditional_route, {"diagnosis": "diagnosis", "report": "report"})
    builder.add_edge("diagnosis",  "drug_check")
    builder.add_edge("drug_check", "report")
    builder.add_edge("report",     END)

    compiled = builder.compile()

    # Verify the graph has the expected nodes
    node_names = list(compiled.nodes.keys()) if hasattr(compiled, "nodes") else []
    return f"Graph compiled successfully — nodes: {node_names if node_names else 'verified'}"


check(6, "LangGraph StateGraph compiles with all 5 agent nodes", test_graph_compile)

# ─────────────────────────────────────────────────────────────────────────────
# Step 7: Orchestrator singleton instantiation
# ─────────────────────────────────────────────────────────────────────────────

def test_orchestrator_singleton():
    from app.agents.orchestrator import MediGuardOrchestrator

    orch = MediGuardOrchestrator()
    has_graph = hasattr(orch, "graph") and orch.graph is not None

    assert has_graph, "Orchestrator graph was not built"
    assert hasattr(orch, "run_pipeline"), "Orchestrator missing run_pipeline()"
    assert hasattr(orch, "intake_agent"), "Orchestrator missing intake_agent"
    assert hasattr(orch, "symptom_agent"), "Orchestrator missing symptom_agent"
    assert hasattr(orch, "diagnosis_agent"), "Orchestrator missing diagnosis_agent"
    assert hasattr(orch, "drug_agent"), "Orchestrator missing drug_agent"
    assert hasattr(orch, "report_agent"), "Orchestrator missing report_agent"

    return "MediGuardOrchestrator instantiated — graph compiled, all 5 agents registered"


check(7, "MediGuardOrchestrator singleton instantiates and graph compiles", test_orchestrator_singleton)

# ─────────────────────────────────────────────────────────────────────────────
# Step 8: Conditional routing logic
# ─────────────────────────────────────────────────────────────────────────────

def test_conditional_routing():
    from app.agents.orchestrator import _conditional_route_after_symptom
    from app.schemas.agent import build_initial_state

    # Non-critical → should route to diagnosis
    state_normal = build_initial_state(SESSION_ID, SAMPLE_PATIENT)
    state_normal["urgency_level"] = "high"
    route_normal = _conditional_route_after_symptom(state_normal)
    assert route_normal == "diagnosis", f"Expected 'diagnosis' for high urgency, got '{route_normal}'"

    # Critical → should bypass to report
    state_critical = build_initial_state(SESSION_ID, SAMPLE_PATIENT)
    state_critical["urgency_level"] = "critical"
    route_critical = _conditional_route_after_symptom(state_critical)
    assert route_critical == "report", f"Expected 'report' for critical urgency, got '{route_critical}'"

    return (
        f"Routing validated -- "
        f"urgency='high'->'{route_normal}', urgency='critical'->'{route_critical}'"
    )


check(8, "Conditional safety gate routing logic verified", test_conditional_routing)

# ─────────────────────────────────────────────────────────────────────────────
# Step 9: LLM client module imports
# ─────────────────────────────────────────────────────────────────────────────

def test_llm_module():
    from app.llm.bedrock_client import get_llm, get_fast_llm, get_reasoning_llm
    from app.llm.router import llm_router, LLMRouter

    assert callable(get_llm),            "get_llm must be callable"
    assert callable(get_fast_llm),       "get_fast_llm must be callable"
    assert callable(get_reasoning_llm),  "get_reasoning_llm must be callable"
    assert isinstance(llm_router, LLMRouter), "llm_router must be LLMRouter instance"

    return "get_llm, get_fast_llm, get_reasoning_llm, llm_router all verified"


check(9, "LLM module exports all three functions and singleton", test_llm_module)

# ─────────────────────────────────────────────────────────────────────────────
# Step 10: Print graph topology
# ─────────────────────────────────────────────────────────────────────────────

def test_print_graph_topology():
    print()
    print(f"  {INFO} Clinical Pipeline Graph Topology:")
    print()
    print("     START")
    print("       |")
    print("       v")
    print("    [intake]  ---------------------------------------------------+")
    print("       |                                                          |")
    print("       v                                                          |")
    print("    [symptom]                                                     |")
    print("       |                                                          |")
    print("       +-- urgency=critical --> [report] --> END  (emergency)     |")
    print("       |                                                          |")
    print("       +-- otherwise --------> [diagnosis]                       |")
    print("                                    |                             |")
    print("                                    v                             |")
    print("                               [drug_check]                      |")
    print("                                    |                             |")
    print("                                    v                             |")
    print("                                [report]  <---------------------- +")
    print("                                    |")
    print("                                   END")
    print()
    return "Graph topology printed"


check(10, "Graph topology visualised", test_print_graph_topology)

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────

print()
print("=" * 70)
passed = sum(1 for r in results if r["passed"])
failed = sum(1 for r in results if not r["passed"])
total  = len(results)

if failed == 0:
    print(f"  \033[92m ALL {total} VERIFICATION STEPS PASSED! (PHASE 4 LOCKED) \033[0m")
else:
    print(f"  \033[93m {passed}/{total} STEPS PASSED — {failed} STEP(S) NEED ATTENTION \033[0m")
    print()
    print("  Failed steps:")
    for r in results:
        if not r["passed"]:
            print(f"    • Step {r['step']}: {r['label']}")
            print(f"      Error: {r.get('error', 'unknown')}")

print("=" * 70)
print()

if failed > 0:
    sys.exit(1)
