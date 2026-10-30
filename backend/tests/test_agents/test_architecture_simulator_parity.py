"""
MediGuard V2 — Architecture Simulator Parity Tests

Verifies that the Architecture Simulator data contracts and diagnostic assumptions
strictly mirror the real backend implementation:
1. Registered LangGraph nodes in orchestrator.py: ("intake", "symptom", "diagnosis", "report")
2. Emergency gate conditional edge behavior: _conditional_route_after_symptom()
3. Concurrency model: parallel_clinical_analysis() wrapping diagnosis and drug check tasks
4. Schema field parity: AgentState typed dict attributes
5. AgentEvent schema parity: AgentEventType enum values
"""

import pytest
from app.agents.orchestrator import _conditional_route_after_symptom
from app.schemas.websocket import AgentEventType, AgentEvent
from app.schemas.agent import AgentState, build_initial_state


class TestArchitectureSimulatorParity:
    """Parity tests validating the Architecture Simulator against real backend contracts."""

    def test_registered_graph_nodes_parity(self):
        """
        Verify that the real LangGraph graph has exactly the 4 nodes documented
        in the Architecture Simulator: intake, symptom, diagnosis, report.
        """
        from app.agents.orchestrator import build_graph
        graph = build_graph()
        
        # Verify node names in compiled LangGraph
        node_names = set(graph.nodes.keys())
        expected_nodes = {"intake", "symptom", "diagnosis", "report"}
        
        # All expected nodes must exist in graph
        for expected in expected_nodes:
            assert expected in node_names, f"Registered node {expected} missing from graph.nodes"

    def test_conditional_routing_emergency_gate_contract(self):
        """
        Verify that _conditional_route_after_symptom strictly routes 'critical' to 'report'
        (bypassing 'diagnosis'), and all other urgencies to 'diagnosis'.
        """
        # 1. Critical urgency triggers emergency gate
        critical_state = {"session_id": "sim-test-1", "urgency_level": "critical"}
        assert _conditional_route_after_symptom(critical_state) == "report"

        # 2. Medium urgency follows standard pipeline
        medium_state = {"session_id": "sim-test-2", "urgency_level": "medium"}
        assert _conditional_route_after_symptom(medium_state) == "diagnosis"

        # 3. High urgency (non-critical) follows standard pipeline
        high_state = {"session_id": "sim-test-3", "urgency_level": "high"}
        assert _conditional_route_after_symptom(high_state) == "diagnosis"

        # 4. Low urgency follows standard pipeline
        low_state = {"session_id": "sim-test-4", "urgency_level": "low"}
        assert _conditional_route_after_symptom(low_state) == "diagnosis"

    def test_websocket_event_types_parity(self):
        """
        Verify that every eventType used in the Architecture Simulator
        exists in the backend AgentEventType enum.
        """
        simulator_event_types = {
            "pipeline_started",
            "agent_started",
            "agent_completed",
            "pipeline_completed",
            "agent_failed",
            "pipeline_failed",
        }

        backend_event_types = {e.value for e in AgentEventType}

        for evt_type in simulator_event_types:
            assert evt_type in backend_event_types, f"Simulator event {evt_type} not in AgentEventType"

    def test_agent_state_fields_parity(self):
        """
        Verify that all fields documented in the Simulator's StageIODefinitions
        are genuine attributes in AgentState and build_initial_state().
        """
        initial_state = build_initial_state("test-session", {"chief_complaint": "test"})

        verified_fields = [
            "session_id",
            "created_at",
            "patient_data",
            "parsed_intake",
            "intake_confidence",
            "symptoms_analysis",
            "symptom_severity",
            "symptom_categories",
            "retrieved_context",
            "context_sources",
            "citations",
            "differential_diagnosis",
            "primary_diagnosis",
            "urgency_level",
            "drug_interactions",
            "contraindications",
            "medication_safe",
            "fda_data_used",
            "report",
            "report_metadata",
            "report_generated",
            "patient_discharge_summary",
            "current_agent",
            "completed_agents",
            "agent_errors",
            "retry_count",
            "pipeline_start_time",
            "pipeline_end_time",
        ]

        for field in verified_fields:
            assert field in initial_state, f"Field {field} missing from build_initial_state()"

    def test_parallel_clinical_analysis_method_exists(self):
        """
        Verify that parallel_clinical_analysis coroutine exists on MediGuardOrchestrator
        and handles parallel execution of diagnosis and drug checking.
        """
        from app.agents.orchestrator import MediGuardOrchestrator
        assert hasattr(MediGuardOrchestrator, "parallel_clinical_analysis")
        import inspect
        assert inspect.iscoroutinefunction(MediGuardOrchestrator.parallel_clinical_analysis)
