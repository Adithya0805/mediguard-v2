from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Dict, Any, List
import time
from app.dependencies import get_current_staff, get_db
from app.schemas.auth import TokenData
from app.services.analytics_service import AnalyticsService

router = APIRouter()

# Simple thread-safe in-memory cache dictionary: key -> (value, expiry_timestamp)
_cache: Dict[str, tuple] = {}


def get_cached_data(key: str) -> Any:
    """Retrieve data from cache if it exists and has not expired."""
    if key in _cache:
        val, expiry = _cache[key]
        if time.time() < expiry:
            return val
    return None


def set_cached_data(key: str, val: Any, ttl: int = 300):
    """Set data into cache with a specific Time to Live (default 5 minutes)."""
    _cache[key] = (val, time.time() + ttl)


def get_cache_key(institution_id: str, endpoint: str, days: int = 30, limit: int = 10) -> str:
    """Generate a clean, tenant-scoped cache key."""
    return f"{institution_id}:{endpoint}:days_{days}:limit_{limit}"


@router.get("/dashboard")
async def get_dashboard(
    days: int = Query(default=30, ge=1, le=365),
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Get the full analytics dashboard (cached for 5 minutes).Scope is institution-locked."""
    cache_key = get_cache_key(current_staff.institution_id, "dashboard", days=days)
    cached = get_cached_data(cache_key)
    if cached:
        return cached

    service = AnalyticsService(db, current_staff.institution_id)
    data = await service.get_full_dashboard()
    set_cached_data(cache_key, data)
    return data


@router.get("/overview")
async def get_overview(
    days: int = Query(default=30, ge=1, le=365),
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Get overview summary statistics (cached)."""
    cache_key = get_cache_key(current_staff.institution_id, "overview", days=days)
    cached = get_cached_data(cache_key)
    if cached:
        return cached

    service = AnalyticsService(db, current_staff.institution_id)
    data = await service.get_overview_stats(days)
    set_cached_data(cache_key, data)
    return data


@router.get("/trend")
async def get_trend(
    days: int = Query(default=30, ge=1, le=365),
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Get daily session counts trend (cached)."""
    cache_key = get_cache_key(current_staff.institution_id, "trend", days=days)
    cached = get_cached_data(cache_key)
    if cached:
        return cached

    service = AnalyticsService(db, current_staff.institution_id)
    data = await service.get_daily_trend(days)
    set_cached_data(cache_key, data)
    return data


@router.get("/agents")
async def get_agents(
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Get agent pipeline execution statistics (cached)."""
    cache_key = get_cache_key(current_staff.institution_id, "agents")
    cached = get_cached_data(cache_key)
    if cached:
        return cached

    service = AnalyticsService(db, current_staff.institution_id)
    data = await service.get_agent_performance()
    set_cached_data(cache_key, data)
    return data


@router.get("/diagnoses")
async def get_diagnoses(
    limit: int = Query(default=10, ge=1, le=100),
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Get top primary diagnoses candidate list (cached)."""
    cache_key = get_cache_key(current_staff.institution_id, "diagnoses", limit=limit)
    cached = get_cached_data(cache_key)
    if cached:
        return cached

    service = AnalyticsService(db, current_staff.institution_id)
    data = await service.get_top_diagnoses(limit)
    set_cached_data(cache_key, data)
    return data


@router.get("/drugs")
async def get_drugs(
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Get drug pharmaceutical interactions warnings summary (cached)."""
    cache_key = get_cache_key(current_staff.institution_id, "drugs")
    cached = get_cached_data(cache_key)
    if cached:
        return cached

    service = AnalyticsService(db, current_staff.institution_id)
    data = await service.get_drug_interactions_summary()
    set_cached_data(cache_key, data)
    return data


@router.get("/demographics")
async def get_demographics(
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Get patient demographics age & gender split details (cached)."""
    cache_key = get_cache_key(current_staff.institution_id, "demographics")
    cached = get_cached_data(cache_key)
    if cached:
        return cached

    service = AnalyticsService(db, current_staff.institution_id)
    data = await service.get_patient_demographics()
    set_cached_data(cache_key, data)
    return data


@router.get("/anomalies")
async def get_anomalies(
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Get current active command center bottlenecks and spikes (always fresh, uncached)."""
    service = AnalyticsService(db, current_staff.institution_id)
    return await service.get_anomalies()
