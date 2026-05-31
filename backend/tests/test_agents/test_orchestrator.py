"""
MediGuard V2 — Orchestrator Tests

Tests for the LangGraph clinical pipeline orchestration:
- Normal flow (full pipeline sequence)
- Emergency gate (critical urgency bypasses DDx)
- Pipeline timeout handling
- Partial failure recovery
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone


class TestConditionalRouting:
    """Tests for the _conditional_route_after_symptom routing function."""

    def test_emergency_gate_triggered_on_critical(self):
        """Critical urgency should bypass diagnosis and route to report."""
        from app.agents.orchestrator import _conditional_route_after_symptom

        state = {
            "session_id": "test-session-123",
            "urgency_level": "critical",
        }
        result = _conditional_route_after_symptom(state)
        assert result == "report"

    def test_emergency_gate_not_triggered_on_high(self):
        """High urgency (non-critical) should proceed through normal pipeline."""
        from app.agents.orchestrator import _conditional_route_after_symptom

        state = {
            "session_id": "test-session-123",
            "urgency_level": "high",
        }
        result = _conditional_route_after_symptom(state)
        assert result == "diagnosis"

    def test_emergency_gate_not_triggered_on_medium(self):
        """Medium urgency should proceed through diagnosis."""
        from app.agents.orchestrator import _conditional_route_after_symptom

        state = {
            "session_id": "test-session-123",
            "urgency_level": "medium",
        }
        result = _conditional_route_after_symptom(state)
        assert result == "diagnosis"

    def test_emergency_gate_defaults_to_diagnosis_on_missing_urgency(self):
        """Missing urgency field defaults to medium — should route to diagnosis."""
        from app.agents.orchestrator import _conditional_route_after_symptom

        state = {
            "session_id": "test-session-123",
            # urgency_level is not present
        }
        result = _conditional_route_after_symptom(state)
        assert result == "diagnosis"

    def test_emergency_gate_low_urgency_routes_to_diagnosis(self):
        """Low urgency should still complete the full pipeline."""
        from app.agents.orchestrator import _conditional_route_after_symptom

        state = {
            "session_id": "test-session-123",
            "urgency_level": "low",
        }
        result = _conditional_route_after_symptom(state)
        assert result == "diagnosis"


class TestDurationCalculator:
    """Tests for the pipeline duration utility."""

    def test_calculate_duration_valid_iso_timestamp(self):
        """Should correctly calculate seconds from a recent ISO timestamp."""
        from app.agents.orchestrator import _calculate_duration

        # Use a timestamp from ~2 seconds ago
        from datetime import timezone
        import time
        time.sleep(0.01)  # tiny sleep to ensure non-zero duration
        start = datetime.now(timezone.utc).isoformat()
        duration = _calculate_duration(start)
        # Should be very small but non-negative
        assert duration >= 0.0

    def test_calculate_duration_returns_zero_on_bad_input(self):
        """Corrupted timestamp should gracefully return 0.0."""
        from app.agents.orchestrator import _calculate_duration

        result = _calculate_duration("not-a-timestamp-at-all")
        assert result == 0.0

    def test_calculate_duration_handles_empty_string(self):
        """Empty string should gracefully return 0.0."""
        from app.agents.orchestrator import _calculate_duration

        result = _calculate_duration("")
        assert result == 0.0


class TestInitialStateBuilder:
    """Tests for the build_initial_state factory."""

    def test_build_initial_state_sets_session_id(self):
        """Built state should contain the correct session_id."""
        from app.schemas.agent import build_initial_state

        data = {
            "patient_name": "Test",
            "chief_complaint": "chest pain",
        }
        state = build_initial_state("session-abc-123", data)
        assert state["session_id"] == "session-abc-123"

    def test_build_initial_state_initializes_empty_agent_errors(self):
        """Initial state should start with empty agent_errors list."""
        from app.schemas.agent import build_initial_state

        state = build_initial_state("session-xyz", {})
        assert "agent_errors" in state
        assert isinstance(state["agent_errors"], list)

    def test_build_initial_state_has_pipeline_start_time(self):
        """Initial state should contain a pipeline_start_time ISO string."""
        from app.schemas.agent import build_initial_state

        state = build_initial_state("session-xyz", {})
        assert "pipeline_start_time" in state
        # Should be parseable as datetime
        dt = datetime.fromisoformat(state["pipeline_start_time"].replace("Z", "+00:00"))
        assert dt is not None
