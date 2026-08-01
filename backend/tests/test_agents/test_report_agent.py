"""
MediGuard V2 — Report Agent Tests

Tests for app.agents.report_agent robustness:
- Valid LLM output → fully normalised report with orchestration metadata
- Malformed / partial / null / array-wrapped output handling
- Mandatory disclaimer merging
- State enrichment (self-contained report)
- Bounded single retry (success and failure paths)
- Fallback report on total failure (persists, merged, never crashes)
"""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.agents.report_agent import ReportAgent, _safe_parse_report_json


# ── Test data builders ────────────────────────────────────────────────────────

def _base_state(**overrides):
    from app.schemas.agent import build_initial_state

    state = build_initial_state("12345678-1234-5678-1234-567812345678", {"patient_name": "Test Patient"})
    state.update({
        "completed_agents": ["intake", "symptom", "diagnosis", "drug_check"],
        "context_sources": ["PMID-1", "PMID-2"],
        "primary_diagnosis": {"diagnosis": "Acute MI", "confidence": 0.9, "icd10": "I21.9"},
        "citations": [{"pmid": "100", "title": "Stable Title", "url": "https://pubmed.example/100"}],
        "drug_interactions": [{"interaction": "metformin + alcohol", "severity": "moderate"}],
        "differential_diagnosis": [{"diagnosis": "Acute MI", "confidence": 0.9}],
        "contraindications": ["warfarin"],
        "medication_safe": False,
        "fda_data_used": True,
        "urgency_level": "high",
        "parsed_intake": {"patient_summary": "45yo male, chest pain."},
    })
    state.update(overrides)
    return state


def _valid_report_dict():
    return {
        "executive_summary": "Executive summary referencing [1].",
        "clinical_narrative": "Full narrative with citation [1].",
        "primary_impression": "Acute MI with high confidence.",
        "differential_summary": "Ranked differential [1].",
        "recommended_workup": ["ECG", "Troponin"],
        "medication_notes": "No clinically significant interactions [1].",
        "urgency_assessment": "High urgency justified by symptom profile.",
        "disposition_recommendation": "Admit to cardiology.",
        "follow_up_instructions": ["Cardiology review", "Repeat troponin"],
        "clinical_disclaimers": ["Extra model-specific disclaimer."],
        "report_metadata": {
            "agents_used": [],
            "generation_time_seconds": 0,
            "model_used": "",
            "rag_sources_count": 0,
        },
        "citations": {
            "1": {"pmid": "100", "title": "Stable Title", "url": "https://pubmed.example/100"}
        },
    }


def _llm_response(text):
    return SimpleNamespace(content=text)


def _make_llm(responses, model_id="test-claude-sonnet"):
    llm = MagicMock()
    llm.ainvoke = AsyncMock(side_effect=responses)
    llm.model_id = model_id
    return llm


def _make_agent(llm):
    router = MagicMock()
    router.route.return_value = llm
    return ReportAgent(router, MagicMock())


async def _run(llm, state=None):
    agent = _make_agent(llm)
    return await agent.run(state if state is not None else _base_state())


def _report_json(**overrides):
    payload = _valid_report_dict()
    payload.update(overrides)
    return json.dumps(payload)


# ── Parser unit tests ─────────────────────────────────────────────────────────

class TestSafeParseReportJson:
    def test_plain_json_parses(self):
        result = _safe_parse_report_json(json.dumps({"a": 1}))
        assert result == {"a": 1}

    def test_markdown_fenced_json_parses(self):
        raw = "```json\n{\"a\": 1}\n```"
        assert _safe_parse_report_json(raw) == {"a": 1}

    def test_prose_wrapped_json_parses(self):
        raw = "Here is your report:\n{\"a\": 1}\nHope this helps."
        assert _safe_parse_report_json(raw) == {"a": 1}

    def test_multi_line_json_parses(self):
        raw = '{\n  "a": 1,\n  "b": "two"\n}'
        assert _safe_parse_report_json(raw) == {"a": 1, "b": "two"}

    def test_single_element_array_unwrapped(self):
        result = _safe_parse_report_json('[{"a": 1}]')
        assert result == {"a": 1}

    def test_multi_element_array_rejected(self):
        assert _safe_parse_report_json('[{"a": 1}, {"b": 2}]') is None

    def test_scalar_rejected(self):
        assert _safe_parse_report_json('"just a string"') is None

    def test_empty_string_rejected(self):
        assert _safe_parse_report_json("") is None

    def test_garbage_rejected(self):
        assert _safe_parse_report_json("not json at all {{{") is None


# ── Agent success path ────────────────────────────────────────────────────────

class TestReportAgentSuccess:
    async def test_valid_report_generates_fully(self):
        llm = _make_llm([_llm_response(_report_json())])
        state = await _run(llm)

        assert state["report_generated"] is True
        report = state["report"]
        assert report["executive_summary"] == "Executive summary referencing [1]."
        assert report["recommended_workup"] == ["ECG", "Troponin"]
        assert "report" in state["completed_agents"]
        assert state["current_agent"] == "done"
        assert state["pipeline_end_time"]

    async def test_report_metadata_populated_from_orchestration(self):
        llm = _make_llm([_llm_response(_report_json())])
        state = await _run(llm)

        meta = state["report"]["report_metadata"]
        assert meta["agents_used"] == ["intake", "symptom", "diagnosis", "drug_check", "report"]
        assert meta["model_used"] == "test-claude-sonnet"
        assert meta["rag_sources_count"] == 2
        assert isinstance(meta["generation_time_seconds"], float)

        # Mirrored at top-level so downstream final_state contract picks it up
        assert state["report_metadata"] == meta

    async def test_null_report_metadata_does_not_crash(self):
        llm = _make_llm([_llm_response(_report_json(report_metadata=None))])
        state = await _run(llm)

        meta = state["report"]["report_metadata"]
        assert meta["agents_used"][-1] == "report"
        assert meta["model_used"] == "test-claude-sonnet"

    async def test_sparse_report_fills_safe_defaults(self):
        llm = _make_llm([_llm_response('{"executive_summary": "only this key"}')])
        state = await _run(llm)

        report = state["report"]
        assert report["executive_summary"] == "only this key"
        assert report["clinical_narrative"] == ""
        assert report["recommended_workup"] == []
        assert report["follow_up_instructions"] == []
        assert "clinical_disclaimers" in report
        assert "report_metadata" in report

    async def test_empty_object_report_still_normalises(self):
        llm = _make_llm([_llm_response("{}")])
        state = await _run(llm)

        report = state["report"]
        assert report["executive_summary"]
        assert isinstance(report["recommended_workup"], list)
        assert isinstance(report["clinical_disclaimers"], list)
        assert report["report_metadata"]["agents_used"][-1] == "report"

    async def test_report_enriched_with_state_data(self):
        llm = _make_llm([_llm_response(_report_json(primary_diagnosis=None, citations=None))])
        state = await _run(llm)

        report = state["report"]
        # State values backfilled into a self-contained report
        assert report["primary_diagnosis"] == {"diagnosis": "Acute MI", "confidence": 0.9, "icd10": "I21.9"}
        assert report["citations"] == [{"pmid": "100", "title": "Stable Title", "url": "https://pubmed.example/100"}]
        assert report["drug_interactions"] == [{"interaction": "metformin + alcohol", "severity": "moderate"}]
        assert report["contraindications"] == ["warfarin"]
        assert report["medication_safety"] is False
        assert report["fda_data_used"] is True
        assert report["urgency_level"] == "high"

    async def test_llm_primary_diagnosis_wins_over_state(self):
        llm = _make_llm([_llm_response(_report_json(
            primary_diagnosis={"diagnosis": "Unstable Angina", "confidence": 0.7}
        ))])
        state = await _run(llm)

        assert state["report"]["primary_diagnosis"]["diagnosis"] == "Unstable Angina"


# ── Disclaimer merging ────────────────────────────────────────────────────────

class TestDisclaimerMerging:
    async def test_empty_disclaimers_merged_with_mandatory(self):
        llm = _make_llm([_llm_response(_report_json(clinical_disclaimers=[]))])
        state = await _run(llm)

        disclaimers = state["report"]["clinical_disclaimers"]
        assert any("AI-generated clinical decision support" in d for d in disclaimers)
        assert any("licensed physician" in d for d in disclaimers)
        assert any("does not replace clinical judgment" in d for d in disclaimers)

    async def test_missing_disclaimers_merged_with_mandatory(self):
        llm = _make_llm([_llm_response(_report_json())])
        state = await _run(llm)

        disclaimers = state["report"]["clinical_disclaimers"]
        assert "Extra model-specific disclaimer." in disclaimers
        assert any("licensed physician" in d for d in disclaimers)

    async def test_no_duplicate_mandatory_disclaimers(self):
        llm = _make_llm([_llm_response(_report_json(
            clinical_disclaimers=["This system does not replace clinical judgment."]
        ))])
        state = await _run(llm)

        disclaimers = state["report"]["clinical_disclaimers"]
        assert disclaimers.count("This system does not replace clinical judgment.") == 1


# ── Retry behaviour ───────────────────────────────────────────────────────────

class TestRetryBehaviour:
    async def test_retry_success_after_bad_first_attempt(self):
        llm = _make_llm([
            _llm_response("not valid json at all"),
            _llm_response(_report_json()),
        ])
        state = await _run(llm)

        assert state["report_generated"] is True
        assert state["retry_count"] == 1
        assert state["report"]["executive_summary"] == "Executive summary referencing [1]."
        assert not state["agent_errors"]

    async def test_retry_failure_builds_fallback_report(self):
        llm = _make_llm([
            _llm_response("first failure"),
            _llm_response("second failure"),
        ])
        state = await _run(llm)

        assert state["report_generated"] is True
        assert state["retry_count"] == 1
        assert len(state["agent_errors"]) == 1
        assert state["agent_errors"][0]["agent"] == "report"
        assert "physician" in state["report"]["executive_summary"].lower()
        assert "ALERT" in " ".join(state["report"]["clinical_disclaimers"])

    async def test_retry_bounded_to_single_attempt(self):
        llm = _make_llm([_llm_response("fail")])
        state = await _run(llm, _base_state(retry_count=1))

        assert state["retry_count"] == 1  # never incremented past bound
        assert len(state["agent_errors"]) == 1
        assert state["report"]["report_metadata"]["model_used"] == "fallback"

    async def test_fallback_report_is_enriched_with_state(self):
        llm = _make_llm([_llm_response("complete garbage")])
        state = await _run(llm)

        report = state["report"]
        assert report["primary_diagnosis"] == {"diagnosis": "Acute MI", "confidence": 0.9, "icd10": "I21.9"}
        assert report["citations"] == [{"pmid": "100", "title": "Stable Title", "url": "https://pubmed.example/100"}]
        assert report["fda_data_used"] is True
        assert report["urgency_level"] == "high"

    async def test_llm_exception_builds_fallback_report(self):
        llm = _make_llm([
            Exception("Bedrock connection refused"),
            Exception("Bedrock connection refused again"),
        ])
        state = await _run(llm)

        assert state["report_generated"] is True
        assert len(state["agent_errors"]) == 1
        assert "Bedrock connection refused" in state["agent_errors"][0]["error"]
        assert state["report"]["report_metadata"]["model_used"] == "fallback"
