"""
MediGuard V2 — In-Process Metrics Collector

Tracks operational counters and histograms for the clinical pipeline.
Exposed via GET /api/v1/metrics (API-key protected).

Metrics tracked:
- pipeline_runs_total       (counter, by status: started/completed/failed)
- pipeline_duration_seconds (list of durations in seconds)
- agent_errors_total        (counter per agent_name)
- llm_calls_total           (counter per model_tier: fast/reasoning/streaming)
- rag_retrievals_total      (counter)
- active_sessions           (gauge)
"""
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List

from app.utils.logger import get_logger

logger = get_logger("app.utils.metrics")


@dataclass
class MetricsSnapshot:
    """Serializable snapshot of all current metrics."""
    pipeline_runs:           Dict[str, int]
    pipeline_durations_p50:  float
    pipeline_durations_p95:  float
    pipeline_durations_avg:  float
    agent_errors:            Dict[str, int]
    llm_calls:               Dict[str, int]
    rag_retrievals:          int
    active_sessions:         int
    uptime_seconds:          float
    timestamp:               str


class MetricsCollector:
    """
    Singleton in-process metrics collector for MediGuard V2.

    All operations are O(1) or O(log n) — safe for use in hot paths.
    """

    def __init__(self) -> None:
        self._start_time = time.monotonic()

        # Pipeline run counters: status -> count
        self._pipeline_runs: Dict[str, int] = defaultdict(int)

        # Duration samples (seconds) — keep last 1000
        self._pipeline_durations: List[float] = []
        self._MAX_DURATION_SAMPLES = 1000

        # Per-agent error counter
        self._agent_errors: Dict[str, int] = defaultdict(int)

        # LLM call counter per tier
        self._llm_calls: Dict[str, int] = defaultdict(int)

        # RAG retrieval counter
        self._rag_retrievals: int = 0

        # Active session gauge
        self._active_sessions: int = 0

        logger.info("MetricsCollector initialized")

    # ── Pipeline metrics ──────────────────────────────────────────────────────

    def record_pipeline_start(self) -> None:
        """Increment the started pipeline counter."""
        self._pipeline_runs["started"] += 1
        self._active_sessions = max(0, self._active_sessions + 1)

    def record_pipeline_complete(self, duration_seconds: float) -> None:
        """Record a successfully completed pipeline run with its duration."""
        self._pipeline_runs["completed"] += 1
        self._active_sessions = max(0, self._active_sessions - 1)
        self._pipeline_durations.append(duration_seconds)
        if len(self._pipeline_durations) > self._MAX_DURATION_SAMPLES:
            self._pipeline_durations.pop(0)

    def record_pipeline_failure(self, duration_seconds: float = 0.0) -> None:
        """Record a failed pipeline run."""
        self._pipeline_runs["failed"] += 1
        self._active_sessions = max(0, self._active_sessions - 1)
        if duration_seconds > 0:
            self._pipeline_durations.append(duration_seconds)

    # ── Agent metrics ─────────────────────────────────────────────────────────

    def record_agent_error(self, agent_name: str) -> None:
        """Increment the error counter for a specific agent."""
        self._agent_errors[agent_name] += 1

    # ── LLM metrics ───────────────────────────────────────────────────────────

    def record_llm_call(self, model_tier: str = "fast") -> None:
        """
        Track an LLM API call by tier.

        Args:
            model_tier: One of 'fast', 'reasoning', 'streaming'.
        """
        self._llm_calls[model_tier] += 1

    # ── RAG metrics ───────────────────────────────────────────────────────────

    def record_rag_retrieval(self) -> None:
        """Increment the RAG vector retrieval counter."""
        self._rag_retrievals += 1

    # ── Snapshot ──────────────────────────────────────────────────────────────

    def _percentile(self, data: List[float], percentile: float) -> float:
        """Calculate a percentile value from a sorted list."""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        index = min(index, len(sorted_data) - 1)
        return round(sorted_data[index], 3)

    def snapshot(self) -> dict:
        """Return a serializable dict of all current metrics."""
        from datetime import datetime, timezone
        durations = self._pipeline_durations

        return {
            "pipeline_runs":             dict(self._pipeline_runs),
            "pipeline_duration_p50_s":   self._percentile(durations, 50),
            "pipeline_duration_p95_s":   self._percentile(durations, 95),
            "pipeline_duration_avg_s":   round(
                sum(durations) / len(durations), 3
            ) if durations else 0.0,
            "pipeline_duration_samples": len(durations),
            "agent_errors":              dict(self._agent_errors),
            "llm_calls":                 dict(self._llm_calls),
            "rag_retrievals_total":      self._rag_retrievals,
            "active_sessions":           self._active_sessions,
            "uptime_seconds":            round(time.monotonic() - self._start_time, 1),
            "timestamp":                 datetime.now(timezone.utc).isoformat(),
        }


# ── Module-level singleton ────────────────────────────────────────────────────
metrics = MetricsCollector()
