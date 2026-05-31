"""
MediGuard V2 — Enhanced Health Endpoint

Returns a detailed health check including:
- Application uptime and version
- Supabase ping latency
- LLM provider mode (live vs mock)
- Pinecone connectivity status
- Memory usage (RSS)
- Pipeline metrics summary
"""
import os
import time
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.utils.logger import get_logger
from app.utils.metrics import metrics

logger = get_logger("app.api.v1.health")
router = APIRouter()

# Track application start time
_APP_START_TIME = time.monotonic()


class HealthResponse(BaseModel):
    app:       str   = Field(..., description="Application name")
    version:   str   = Field(..., description="Current deployment version")
    status:    str   = Field(..., description="Status description")
    timestamp: str   = Field(..., description="ISO 8601 formatted timestamp")


@router.get("", response_model=HealthResponse)
async def get_health():
    """Returns application name, deployment version, health status, and system time."""
    return HealthResponse(
        app=settings.APP_NAME,
        version="2.0.0",
        status="healthy",
        timestamp=datetime.utcnow().isoformat()
    )


@router.get("/detailed")
async def get_detailed_health():
    """
    Returns detailed health diagnostics including connectivity pings, memory usage,
    pipeline metrics, and provider status. Suitable for monitoring dashboards.
    """
    checks: dict = {}

    # ── Uptime ────────────────────────────────────────────────────────────────
    uptime_seconds = round(time.monotonic() - _APP_START_TIME, 1)

    # ── Supabase connectivity ─────────────────────────────────────────────────
    supabase_status = "unknown"
    supabase_latency_ms = None
    try:
        from app.db.supabase_client import get_supabase_client
        t0 = time.monotonic()
        sb = get_supabase_client()
        sb.table("audit_logs").select("id").limit(1).execute()
        supabase_latency_ms = round((time.monotonic() - t0) * 1000, 1)
        supabase_status = "healthy"
    except Exception as e:
        supabase_status = f"degraded: {str(e)[:80]}"

    checks["supabase"] = {
        "status":     supabase_status,
        "latency_ms": supabase_latency_ms,
    }

    # ── LLM provider ─────────────────────────────────────────────────────────
    llm_provider = settings.LLM_PROVIDER
    llm_status   = "unknown"
    try:
        from app.llm.router import LLMRouter
        router_instance = LLMRouter()
        # Just check initialization — don't actually invoke an LLM
        llm_status = "initialized"
    except Exception as e:
        llm_status = f"error: {str(e)[:60]}"

    checks["llm"] = {
        "provider": llm_provider,
        "status":   llm_status,
    }

    # ── Pinecone connectivity ─────────────────────────────────────────────────
    pinecone_status  = "unknown"
    pinecone_vectors = None
    try:
        from pinecone import Pinecone
        t0 = time.monotonic()
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        index = pc.Index(settings.PINECONE_INDEX_NAME)
        stats = index.describe_index_stats()
        pinecone_vectors = stats.get("total_vector_count", stats.get("namespaces", {}).get("", {}).get("vector_count", 0))
        pinecone_latency_ms = round((time.monotonic() - t0) * 1000, 1)
        pinecone_status = "healthy"
        checks["pinecone"] = {
            "status":      pinecone_status,
            "latency_ms":  pinecone_latency_ms,
            "vector_count": pinecone_vectors,
        }
    except Exception as e:
        checks["pinecone"] = {
            "status": f"degraded: {str(e)[:80]}",
        }

    # ── Memory usage (RSS) ────────────────────────────────────────────────────
    memory_mb = None
    try:
        import psutil
        process  = psutil.Process(os.getpid())
        memory_mb = round(process.memory_info().rss / 1024 / 1024, 1)
    except ImportError:
        memory_mb = None  # psutil optional

    # ── Metrics snapshot ──────────────────────────────────────────────────────
    m = metrics.snapshot()

    # ── Overall status ────────────────────────────────────────────────────────
    all_healthy = all(
        v.get("status") in ("healthy", "initialized")
        for v in checks.values()
        if isinstance(v, dict) and "status" in v
    )

    overall = "healthy" if all_healthy else "degraded"

    return JSONResponse(content={
        "app":             settings.APP_NAME,
        "version":         "2.0.0",
        "status":          overall,
        "environment":     settings.APP_ENV,
        "uptime_seconds":  uptime_seconds,
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "checks":          checks,
        "memory_mb":       memory_mb,
        "metrics_summary": {
            "pipeline_runs":     m.get("pipeline_runs", {}),
            "active_sessions":   m.get("active_sessions", 0),
            "avg_duration_s":    m.get("pipeline_duration_avg_s", 0),
            "p95_duration_s":    m.get("pipeline_duration_p95_s", 0),
            "rag_retrievals":    m.get("rag_retrievals_total", 0),
            "llm_calls":         m.get("llm_calls", {}),
        },
    })
