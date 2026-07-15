from datetime import datetime, timedelta
from typing import Dict, Any, List
import asyncio
from app.db.supabase_client import MockSupabaseClient
from app.utils.logger import get_logger

logger = get_logger("app.services.analytics_service")


class AnalyticsService:
    """Service to aggregate and calculate clinical decision support metrics."""

    def __init__(self, db: Any, institution_id: str):
        self.db = db
        self.institution_id = institution_id

    async def get_overview_stats(self, days: int = 30) -> Dict[str, Any]:
        """Query overview stats for institution."""
        threshold_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        today_date = datetime.utcnow().date().isoformat()
        this_week_start = (datetime.utcnow() - timedelta(days=7)).isoformat()
        last_week_start = (datetime.utcnow() - timedelta(days=14)).isoformat()

        if isinstance(self.db, MockSupabaseClient):
            # Offline-first mock processing
            from app.db.supabase_client import _mock_db
            
            sessions = _mock_db.get("patient_sessions", [])
            reports = _mock_db.get("clinical_reports", [])
            agent_runs = _mock_db.get("agent_runs", [])

            # Filter sessions by institution and date range
            inst_sessions = [
                s for s in sessions 
                if str(s.get("institution_id")) == str(self.institution_id)
            ]
            
            recent_sessions = [
                s for s in inst_sessions 
                if s.get("created_at", "") >= threshold_date
            ]

            total_sessions = len(recent_sessions)
            completed_sessions = len([s for s in recent_sessions if s.get("status") == "completed"])
            
            # Map reports
            recent_session_ids = {str(s["id"]) for s in recent_sessions}
            inst_reports = [r for r in reports if str(r.get("session_id")) in recent_session_ids]

            durations = []
            total_tokens = 0
            urgency_breakdown = {"critical": 0, "high": 0, "medium": 0, "low": 0}

            for r in inst_reports:
                # Find matching session to compute duration
                matching_sess = next((s for s in recent_sessions if str(s["id"]) == str(r["session_id"])), None)
                if matching_sess:
                    created_at_sess = datetime.fromisoformat(matching_sess["created_at"].replace("Z", "+00:00"))
                    created_at_rep = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
                    duration = (created_at_rep - created_at_sess).total_seconds()
                    durations.append(duration)
                
                # Tokens
                sess_runs = [run for run in agent_runs if str(run.get("session_id")) == str(r["session_id"])]
                total_tokens += sum(run.get("tokens_used", 0) or 0 for run in sess_runs)

                # Urgency
                u_level = r.get("urgency_level", "medium").lower()
                if u_level in urgency_breakdown:
                    urgency_breakdown[u_level] += 1

            avg_pipeline = sum(durations) / len(durations) if durations else 0.0
            fastest_pipeline = min(durations) if durations else 0.0
            completion_rate = (completed_sessions * 100.0 / total_sessions) if total_sessions > 0 else 0.0

            # Week-over-week calculation
            sessions_today = len([s for s in inst_sessions if s.get("created_at", "").startswith(today_date)])
            sessions_this_week = len([s for s in inst_sessions if s.get("created_at", "") >= this_week_start])
            sessions_prev_week = len([
                s for s in inst_sessions 
                if last_week_start <= s.get("created_at", "") < this_week_start
            ])

            wow_change = 0.0
            if sessions_prev_week > 0:
                wow_change = ((sessions_this_week - sessions_prev_week) * 100.0 / sessions_prev_week)
            elif sessions_this_week > 0:
                wow_change = 100.0

            return {
                "total_sessions": total_sessions,
                "completed_sessions": completed_sessions,
                "avg_pipeline_seconds": round(avg_pipeline, 2),
                "fastest_pipeline_seconds": round(fastest_pipeline, 2),
                "total_tokens_used": total_tokens,
                "urgency_breakdown": urgency_breakdown,
                "completion_rate_percent": round(completion_rate, 2),
                "sessions_today": sessions_today,
                "sessions_this_week": sessions_this_week,
                "sessions_last_week": sessions_prev_week,
                "week_over_week_change_percent": round(wow_change, 2)
            }

        else:
            # Query from session_analytics view in Supabase
            try:
                # Get total sessions from patient_sessions table to compute actual completion rate
                total_res = self.db.table("patient_sessions").select("id, status, created_at").eq("institution_id", self.institution_id).gte("created_at", threshold_date).execute()
                sess_list = total_res.data or []
                total_sessions = len(sess_list)
                completed_sessions = len([s for s in sess_list if s.get("status") == "completed"])
                completion_rate = (completed_sessions * 100.0 / total_sessions) if total_sessions > 0 else 0.0

                # Fetch pre-aggregated statistics from session_analytics view
                analytics_res = self.db.table("session_analytics").select("*").eq("institution_id", self.institution_id).gte("created_at", threshold_date).execute()
                records = analytics_res.data or []

                durations = [r.get("pipeline_duration_seconds") for r in records if r.get("pipeline_duration_seconds") is not None]
                avg_pipeline = sum(durations) / len(durations) if durations else 0.0
                fastest_pipeline = min(durations) if durations else 0.0
                total_tokens = sum(r.get("total_tokens_used", 0) or 0 for r in records)

                urgency_breakdown = {"critical": 0, "high": 0, "medium": 0, "low": 0}
                for r in records:
                    u_level = str(r.get("urgency_level", "medium")).lower()
                    if u_level in urgency_breakdown:
                        urgency_breakdown[u_level] += 1

                # Week-over-week calculation
                today_res = self.db.table("patient_sessions").select("id").eq("institution_id", self.institution_id).gte("created_at", today_date).execute()
                sessions_today = len(today_res.data or [])

                week_this_res = self.db.table("patient_sessions").select("id").eq("institution_id", self.institution_id).gte("created_at", this_week_start).execute()
                sessions_this_week = len(week_this_res.data or [])

                week_prev_res = self.db.table("patient_sessions").select("id").eq("institution_id", self.institution_id).gte("created_at", last_week_start).lt("created_at", this_week_start).execute()
                sessions_prev_week = len(week_prev_res.data or [])

                wow_change = 0.0
                if sessions_prev_week > 0:
                    wow_change = ((sessions_this_week - sessions_prev_week) * 100.0 / sessions_prev_week)
                elif sessions_this_week > 0:
                    wow_change = 100.0

                return {
                    "total_sessions": total_sessions,
                    "completed_sessions": completed_sessions,
                    "avg_pipeline_seconds": round(avg_pipeline, 2),
                    "fastest_pipeline_seconds": round(fastest_pipeline, 2),
                    "total_tokens_used": total_tokens,
                    "urgency_breakdown": urgency_breakdown,
                    "completion_rate_percent": round(completion_rate, 2),
                    "sessions_today": sessions_today,
                    "sessions_this_week": sessions_this_week,
                    "sessions_last_week": sessions_prev_week,
                    "week_over_week_change_percent": round(wow_change, 2)
                }
            except Exception as e:
                logger.error("Error querying session_analytics overview stats", error=str(e))
                # Graceful fallback return
                return {
                    "total_sessions": 0, "completed_sessions": 0, "avg_pipeline_seconds": 0.0,
                    "fastest_pipeline_seconds": 0.0, "total_tokens_used": 0,
                    "urgency_breakdown": {"critical": 0, "high": 0, "medium": 0, "low": 0},
                    "completion_rate_percent": 0.0, "sessions_today": 0, "sessions_this_week": 0,
                    "sessions_last_week": 0, "week_over_week_change_percent": 0.0
                }

    async def get_daily_trend(self, days: int = 30) -> List[Dict[str, Any]]:
        """Query daily session counts trend, zero-filled for missing dates."""
        threshold_date = (datetime.utcnow() - timedelta(days=days)).date()
        today_date = datetime.utcnow().date()

        # Build list of all dates in the range
        date_list = [threshold_date + timedelta(days=x) for x in range((today_date - threshold_date).days + 1)]
        trends_map = {d.isoformat(): {
            "date": d.strftime("%b %d"),
            "raw_date": d.isoformat(),
            "total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0,
            "avg_pipeline_seconds": 0.0
        } for d in date_list}

        if isinstance(self.db, MockSupabaseClient):
            # Process in-memory mock data
            from app.db.supabase_client import _mock_db
            sessions = _mock_db.get("patient_sessions", [])
            reports = _mock_db.get("clinical_reports", [])

            inst_sessions = [
                s for s in sessions 
                if str(s.get("institution_id")) == str(self.institution_id) and s.get("status") == "completed"
            ]

            # Accumulate stats by day
            day_durations = {}
            for s in inst_sessions:
                dt_str = s.get("created_at", "")[:10]
                if dt_str in trends_map:
                    trends_map[dt_str]["total"] += 1
                    
                    # Urgency mapping
                    rep = next((r for r in reports if str(r.get("session_id")) == str(s["id"])), None)
                    if rep:
                        u_level = rep.get("urgency_level", "medium").lower()
                        if u_level in ["critical", "high", "medium", "low"]:
                            trends_map[dt_str][u_level] += 1
                        
                        # Durations
                        created_at_sess = datetime.fromisoformat(s["created_at"].replace("Z", "+00:00"))
                        created_at_rep = datetime.fromisoformat(rep["created_at"].replace("Z", "+00:00"))
                        duration = (created_at_rep - created_at_sess).total_seconds()
                        day_durations.setdefault(dt_str, []).append(duration)

            for dt_str, durs in day_durations.items():
                trends_map[dt_str]["avg_pipeline_seconds"] = round(sum(durs) / len(durs), 2)

        else:
            # Query daily_session_counts view
            try:
                res = self.db.table("daily_session_counts").select("*").eq("institution_id", self.institution_id).gte("date", threshold_date.isoformat()).execute()
                for row in (res.data or []):
                    dt_str = row.get("date")
                    if dt_str in trends_map:
                        trends_map[dt_str].update({
                            "total": row.get("total_sessions", 0),
                            "critical": row.get("critical_count", 0),
                            "high": row.get("high_count", 0),
                            "medium": row.get("medium_count", 0),
                            "low": row.get("low_count", 0),
                            "avg_pipeline_seconds": round(row.get("avg_pipeline_seconds") or 0.0, 2)
                        })
            except Exception as e:
                logger.error("Error querying daily_session_counts trend view", error=str(e))

        # Return sorted by raw_date ascending
        sorted_trends = [trends_map[k] for k in sorted(trends_map.keys())]
        return sorted_trends

    async def get_agent_performance(self) -> List[Dict[str, Any]]:
        """Query performance benchmarks per agent."""
        agent_names = ["intake", "symptom", "diagnosis", "drug_check", "report"]
        display_names = {
            "intake": "Intake Agent",
            "symptom": "Symptom Agent",
            "diagnosis": "Diagnosis Agent",
            "drug_check": "Drug Screener",
            "report": "Report Orchestrator"
        }

        perf_map = {name: {
            "agent_name": name,
            "display_name": display_names[name],
            "total_runs": 0,
            "success_rate": 100.0,
            "avg_seconds": 0.0,
            "max_seconds": 0.0,
            "avg_tokens": 0.0,
            "status": "healthy"
        } for name in agent_names}

        if isinstance(self.db, MockSupabaseClient):
            # Process in-memory mock agent runs
            from app.db.supabase_client import _mock_db
            sessions = _mock_db.get("patient_sessions", [])
            agent_runs = _mock_db.get("agent_runs", [])

            inst_session_ids = {
                str(s["id"]) for s in sessions 
                if str(s.get("institution_id")) == str(self.institution_id)
            }
            
            inst_runs = [run for run in agent_runs if str(run.get("session_id")) in inst_session_ids]

            agent_groups = {}
            for r in inst_runs:
                name = r.get("agent_name", "").lower()
                if name in perf_map:
                    agent_groups.setdefault(name, []).append(r)

            for name, runs in agent_groups.items():
                total = len(runs)
                successes = len([r for r in runs if r.get("status") == "success"])
                success_rate = (successes * 100.0 / total) if total > 0 else 100.0

                durations = []
                for r in runs:
                    if r.get("completed_at") and r.get("started_at"):
                        start = datetime.fromisoformat(r["started_at"].replace("Z", "+00:00"))
                        end = datetime.fromisoformat(r["completed_at"].replace("Z", "+00:00"))
                        durations.append((end - start).total_seconds())

                avg_sec = sum(durations) / len(durations) if durations else 0.0
                max_sec = max(durations) if durations else 0.0
                avg_tokens = sum(r.get("tokens_used", 0) or 0 for r in runs) / total if total > 0 else 0.0

                status = "healthy"
                if success_rate < 80.0:
                    status = "critical"
                elif success_rate < 95.0:
                    status = "warning"

                perf_map[name].update({
                    "total_runs": total,
                    "success_rate": round(success_rate, 2),
                    "avg_seconds": round(avg_sec, 2),
                    "max_seconds": round(max_sec, 2),
                    "avg_tokens": round(avg_tokens, 2),
                    "status": status
                })

        else:
            # Query agent_performance_stats view
            try:
                res = self.db.table("agent_performance_stats").select("*").eq("institution_id", self.institution_id).execute()
                for row in (res.data or []):
                    name = str(row.get("agent_name")).lower()
                    if name in perf_map:
                        total = row.get("total_runs", 0)
                        success_rate = row.get("success_rate_percent", 100.0)
                        avg_sec = row.get("avg_duration_seconds", 0.0)
                        max_sec = row.get("max_duration_seconds", 0.0)
                        avg_tokens = row.get("avg_tokens_used", 0.0)

                        status = "healthy"
                        if success_rate < 80.0:
                            status = "critical"
                        elif success_rate < 95.0:
                            status = "warning"

                        perf_map[name].update({
                            "total_runs": total,
                            "success_rate": round(success_rate, 2),
                            "avg_seconds": round(avg_sec, 2),
                            "max_seconds": round(max_sec, 2),
                            "avg_tokens": round(avg_tokens, 2),
                            "status": status
                        })
            except Exception as e:
                logger.error("Error querying agent_performance_stats view", error=str(e))

        # Return in pipeline order
        return [perf_map[name] for name in agent_names]

    async def get_top_diagnoses(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Query top diagnoses with frequency and average confidence."""
        if isinstance(self.db, MockSupabaseClient):
            # Process in-memory mock clinical reports
            from app.db.supabase_client import _mock_db
            sessions = _mock_db.get("patient_sessions", [])
            reports = _mock_db.get("clinical_reports", [])

            inst_session_ids = {
                str(s["id"]) for s in sessions 
                if str(s.get("institution_id")) == str(self.institution_id)
            }
            
            inst_reports = [r for r in reports if str(r.get("session_id")) in inst_session_ids]

            diag_groups = {}
            for r in inst_reports:
                pd = r.get("primary_diagnosis")
                if pd and isinstance(pd, dict) and pd.get("diagnosis"):
                    name = pd["diagnosis"]
                    code = pd.get("icd10_code", pd.get("icd_10", "N/A"))
                    conf = pd.get("confidence", 0.0)
                    urgency = r.get("urgency_level", "medium").lower()

                    diag_groups.setdefault(name, {"name": name, "code": code, "confidences": [], "high_urgency_count": 0})
                    diag_groups[name]["confidences"].append(conf)
                    if urgency in ["high", "critical"]:
                        diag_groups[name]["high_urgency_count"] += 1

            results = []
            for name, details in diag_groups.items():
                freq = len(details["confidences"])
                avg_conf = sum(details["confidences"]) / freq if freq > 0 else 0.0
                high_urgency_pct = (details["high_urgency_count"] * 100.0 / freq) if freq > 0 else 0.0
                
                results.append({
                    "diagnosis": name,
                    "icd10_code": details["code"],
                    "count": freq,
                    "avg_confidence": round(avg_conf, 2),
                    "high_urgency_percent": round(high_urgency_pct, 2)
                })

            results.sort(key=lambda x: x["count"], reverse=True)
            return results[:limit]

        else:
            # Query diagnosis_frequency view
            try:
                res = self.db.table("diagnosis_frequency").select("*").eq("institution_id", self.institution_id).limit(limit).execute()
                return [{
                    "diagnosis": r.get("diagnosis_name"),
                    "icd10_code": r.get("icd10_code"),
                    "count": r.get("frequency", 0),
                    "avg_confidence": round(r.get("avg_confidence") or 0.0, 2),
                    "high_urgency_percent": round((r.get("high_urgency_count", 0) * 100.0 / r.get("frequency", 1)) if r.get("frequency", 0) > 0 else 0.0, 2)
                } for r in (res.data or [])]
            except Exception as e:
                logger.error("Error querying diagnosis_frequency view", error=str(e))
                return []

    async def get_drug_interactions_summary(self) -> Dict[str, Any]:
        """Query drug interaction warnings frequency."""
        summary = {
            "total_interactions_detected": 0,
            "most_common_pairs": [],
            "by_severity": {"contraindicated": 0, "severe": 0, "moderate": 0, "mild": 0}
        }

        if isinstance(self.db, MockSupabaseClient):
            # Process in-memory mock data
            from app.db.supabase_client import _mock_db
            sessions = _mock_db.get("patient_sessions", [])
            reports = _mock_db.get("clinical_reports", [])

            inst_session_ids = {
                str(s["id"]) for s in sessions 
                if str(s.get("institution_id")) == str(self.institution_id)
            }
            
            inst_reports = [r for r in reports if str(r.get("session_id")) in inst_session_ids]

            pairs_map = {}
            for r in inst_reports:
                interactions = r.get("drug_interactions_found", [])
                for item in interactions:
                    drug_a = item.get("drug_a", "").lower()
                    drug_b = item.get("drug_b", "").lower()
                    severity = item.get("severity", "moderate").lower()

                    if drug_a and drug_b:
                        # Normalize order to avoid duplicate counts (e.g. drugA-drugB vs drugB-drugA)
                        pair = tuple(sorted([drug_a, drug_b]))
                        pairs_map.setdefault(pair, {"drug_a": pair[0], "drug_b": pair[1], "severity": severity, "count": 0})
                        pairs_map[pair]["count"] += 1
                        
                        summary["total_interactions_detected"] += 1
                        if severity in summary["by_severity"]:
                            summary["by_severity"][severity] += 1

            common_pairs = list(pairs_map.values())
            common_pairs.sort(key=lambda x: x["count"], reverse=True)
            summary["most_common_pairs"] = common_pairs[:5]

        else:
            # Query drug_interaction_frequency view
            try:
                res = self.db.table("drug_interaction_frequency").select("*").eq("institution_id", self.institution_id).execute()
                records = res.data or []

                total = 0
                by_severity = {"contraindicated": 0, "severe": 0, "moderate": 0, "mild": 0}
                pairs = []

                for r in records:
                    drug_a = r.get("drug_a")
                    drug_b = r.get("drug_b")
                    severity = str(r.get("severity", "moderate")).lower()
                    freq = r.get("frequency", 0)

                    total += freq
                    if severity in by_severity:
                        by_severity[severity] += freq

                    pairs.append({
                        "drug_a": drug_a,
                        "drug_b": drug_b,
                        "severity": severity,
                        "count": freq
                    })

                pairs.sort(key=lambda x: x["count"], reverse=True)
                summary.update({
                    "total_interactions_detected": total,
                    "most_common_pairs": pairs[:5],
                    "by_severity": by_severity
                })
            except Exception as e:
                logger.error("Error querying drug_interaction_frequency view", error=str(e))

        return summary

    async def get_patient_demographics(self) -> Dict[str, Any]:
        """Query patient demographics groupings."""
        demographics = {
            "age_groups": {"0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0},
            "gender_split": {"male": 0, "female": 0, "other": 0},
            "avg_age": 0.0
        }

        # Query patient_sessions
        if isinstance(self.db, MockSupabaseClient):
            from app.db.supabase_client import _mock_db
            sessions = _mock_db.get("patient_sessions", [])
            inst_sessions = [
                s for s in sessions 
                if str(s.get("institution_id")) == str(self.institution_id)
            ]
        else:
            try:
                res = self.db.table("patient_sessions").select("patient_age, patient_gender").eq("institution_id", self.institution_id).execute()
                inst_sessions = res.data or []
            except Exception as e:
                logger.error("Error querying demographics patient sessions", error=str(e))
                inst_sessions = []

        if not inst_sessions:
            return demographics

        ages = []
        for s in inst_sessions:
            age = s.get("patient_age")
            if age is not None:
                ages.append(age)
                # Age groups
                if age <= 18:
                    demographics["age_groups"]["0-18"] += 1
                elif age <= 35:
                    demographics["age_groups"]["19-35"] += 1
                elif age <= 50:
                    demographics["age_groups"]["36-50"] += 1
                elif age <= 65:
                    demographics["age_groups"]["51-65"] += 1
                else:
                    demographics["age_groups"]["65+"] += 1

            gender = str(s.get("patient_gender", "other")).lower()
            if gender in demographics["gender_split"]:
                demographics["gender_split"][gender] += 1
            else:
                demographics["gender_split"]["other"] += 1

        demographics["avg_age"] = round(sum(ages) / len(ages), 1) if ages else 0.0
        return demographics

    async def get_anomalies(self) -> List[Dict[str, Any]]:
        """Detect unusual clinical patterns & bottlenecks."""
        anomalies = []
        today_date = datetime.utcnow().date().isoformat()
        prev_7d_date = (datetime.utcnow() - timedelta(days=7)).date().isoformat()
        yesterday_24h = (datetime.utcnow() - timedelta(hours=24)).isoformat()

        if isinstance(self.db, MockSupabaseClient):
            from app.db.supabase_client import _mock_db
            sessions = _mock_db.get("patient_sessions", [])
            reports = _mock_db.get("clinical_reports", [])
            agent_runs = _mock_db.get("agent_runs", [])

            inst_sessions = [
                s for s in sessions 
                if str(s.get("institution_id")) == str(self.institution_id)
            ]
            completed_inst_sessions = [s for s in inst_sessions if s.get("status") == "completed"]
        else:
            try:
                sess_res = self.db.table("patient_sessions").select("id, status, created_at").eq("institution_id", self.institution_id).execute()
                inst_sessions = sess_res.data or []
                completed_inst_sessions = [s for s in inst_sessions if s.get("status") == "completed"]
            except Exception as e:
                logger.error("Error querying anomalies session tables", error=str(e))
                return []

        # 1. Critical cases urgency spike check
        # Get critical counts by day
        critical_by_day = {}
        for s in completed_inst_sessions:
            day = s.get("created_at", "")[:10]
            # Fetch corresponding report urgency
            if isinstance(self.db, MockSupabaseClient):
                rep = next((r for r in reports if str(r.get("session_id")) == str(s["id"])), None)
            else:
                rep_res = self.db.table("clinical_reports").select("urgency_level").eq("session_id", s["id"]).execute()
                rep = rep_res.data[0] if rep_res.data else None
            
            if rep and str(rep.get("urgency_level")).lower() == "critical":
                critical_by_day[day] = critical_by_day.get(day, 0) + 1

        today_critical = critical_by_day.get(today_date, 0)
        
        # Calculate historical 7-day average
        past_critical_counts = [
            critical_by_day.get((datetime.utcnow() - timedelta(days=x)).date().isoformat(), 0)
            for x in range(1, 8)
        ]
        avg_7d = sum(past_critical_counts) / len(past_critical_counts) if past_critical_counts else 0.0

        if today_critical > 0 and today_critical > (2 * avg_7d):
            anomalies.append({
                "type": "critical_spike",
                "severity": "warning" if today_critical <= 3 else "critical",
                "message": f"Critical cases today ({today_critical}) are {round(today_critical/avg_7d if avg_7d > 0 else today_critical, 1)}x above 7-day average ({round(avg_7d, 1)}).",
                "detected_at": datetime.utcnow().isoformat() + "Z"
            })

        # 2. Agent failure spike check (Failure rate > 10% in last 24h)
        if isinstance(self.db, MockSupabaseClient):
            from app.db.supabase_client import _mock_db
            runs = _mock_db.get("agent_runs", [])
            inst_session_ids = {str(s["id"]) for s in inst_sessions}
            recent_runs = [
                r for r in runs 
                if str(r.get("session_id")) in inst_session_ids and r.get("started_at", "") >= yesterday_24h
            ]
        else:
            try:
                # Join with patient_sessions
                runs_res = self.db.table("agent_runs").select("agent_name, status, started_at, patient_sessions!inner(institution_id)").eq("patient_sessions.institution_id", self.institution_id).gte("started_at", yesterday_24h).execute()
                recent_runs = runs_res.data or []
            except Exception as e:
                logger.error("Error querying anomalies agent runs", error=str(e))
                recent_runs = []

        agent_groups = {}
        for r in recent_runs:
            name = r.get("agent_name")
            if name:
                agent_groups.setdefault(name, []).append(r)

        for name, runs in agent_groups.items():
            total = len(runs)
            failures = len([run for run in runs if run.get("status") == "failed"])
            fail_rate = (failures * 100.0 / total) if total > 0 else 0.0

            if fail_rate > 10.0:
                anomalies.append({
                    "type": "agent_failure_spike",
                    "severity": "critical" if fail_rate > 30.0 else "warning",
                    "message": f"Agent '{name}' has a {round(fail_rate, 1)}% failure rate in the last 24 hours.",
                    "detected_at": datetime.utcnow().isoformat() + "Z"
                })

        # 3. Pipeline slowdown check (Pipeline time today > 1.5x 7-day average)
        durations_by_day = {}
        for s in completed_inst_sessions:
            day = s.get("created_at", "")[:10]
            if isinstance(self.db, MockSupabaseClient):
                rep = next((r for r in reports if str(r.get("session_id")) == str(s["id"])), None)
            else:
                rep_res = self.db.table("clinical_reports").select("created_at").eq("session_id", s["id"]).execute()
                rep = rep_res.data[0] if rep_res.data else None

            if rep:
                created_sess = datetime.fromisoformat(s["created_at"].replace("Z", "+00:00"))
                created_rep = datetime.fromisoformat(rep["created_at"].replace("Z", "+00:00"))
                dur = (created_rep - created_sess).total_seconds()
                durations_by_day.setdefault(day, []).append(dur)

        today_durations = durations_by_day.get(today_date, [])
        today_avg = sum(today_durations) / len(today_durations) if today_durations else 0.0

        past_durations = []
        for x in range(1, 8):
            past_durations.extend(durations_by_day.get((datetime.utcnow() - timedelta(days=x)).date().isoformat(), []))
        past_avg = sum(past_durations) / len(past_durations) if past_durations else 0.0

        if today_avg > 0 and today_avg > (1.5 * past_avg):
            anomalies.append({
                "type": "pipeline_slowdown",
                "severity": "warning",
                "message": f"Average pipeline duration today ({round(today_avg, 1)}s) is {round(today_avg/past_avg if past_avg > 0 else today_avg, 1)}x slower than 7-day average ({round(past_avg, 1)}s).",
                "detected_at": datetime.utcnow().isoformat() + "Z"
            })

        return anomalies

    async def get_full_dashboard(self) -> Dict[str, Any]:
        """Run all dashboard queries concurrently."""
        overview, trends, agents, diagnoses, drugs, demographics, anomalies = await asyncio.gather(
            self.get_overview_stats(),
            self.get_daily_trend(),
            self.get_agent_performance(),
            self.get_top_diagnoses(),
            self.get_drug_interactions_summary(),
            self.get_patient_demographics(),
            self.get_anomalies()
        )

        return {
            "institution_id": self.institution_id,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "overview": overview,
            "daily_trend": trends,
            "agent_performance": agents,
            "top_diagnoses": diagnoses,
            "drug_interactions": drugs,
            "patient_demographics": demographics,
            "anomalies": anomalies
        }
