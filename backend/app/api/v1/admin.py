from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks
from typing import Dict, Any, List
import uuid
import asyncio
from app.dependencies import get_current_staff, get_db
from app.schemas.auth import TokenData
from evals.evaluators.agent_evaluator import ClinicalAgentEvaluator

router = APIRouter()


@router.get("/safety-report")
async def get_safety_reports(
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Retrieve list of historical clinical safety evaluation runs for this institution."""
    if current_staff.role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin role required for safety evaluation reports."
        )

    try:
        response = db.table("eval_reports").select("*").eq("institution_id", current_staff.institution_id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("/run-eval")
async def run_safety_evaluation(
    mode: str = Query(default="mock", regex="^(mock|live)$"),
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Trigger a new automated safety evaluation run and persist results."""
    if current_staff.role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin role required to run safety evaluations."
        )

    try:
        # Run safety evaluation pipeline using our evaluator
        use_mock = mode == "mock"
        evaluator = ClinicalAgentEvaluator(use_mock_llm=use_mock)
        
        # Execute E2E run
        report_data = await evaluator.run_all_cases()
        summary_report = evaluator.generate_safety_report(report_data)
        
        # Save evaluation report to database
        eval_record = {
            "evaluation_id": report_data["evaluation_id"],
            "total_cases": report_data["total_cases"],
            "passed_cases": report_data["passed_cases"],
            "failed_cases": report_data["failed_cases"],
            "pass_rate": report_data["pass_rate"],
            "recommendation": report_data["deployment_recommendation"],
            "run_mode": mode,
            "results_json": report_data,
            "summary_report": summary_report,
            "triggered_by": current_staff.staff_id,
            "institution_id": current_staff.institution_id
        }
        
        db.table("eval_reports").insert(eval_record).execute()
        
        return {
            "status": "success",
            "message": "Clinical safety evaluation run completed and saved successfully.",
            "report": eval_record
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Safety evaluation execution failed: {str(e)}"
        )


@router.post("/ingest-rag")
async def trigger_rag_ingestion(
    background_tasks: BackgroundTasks,
    topic: str = Query(default="quick", regex="^(quick|priority|full)$"),
    current_staff: TokenData = Depends(get_current_staff),
    db = Depends(get_db)
):
    """Triggers the PubMed literature ingestion pipeline in the background."""
    if current_staff.role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin role required to run ingestion."
        )
        
    async def run_ingestion_async():
        from app.rag.pubmed_ingestion import PubMedIngestionPipeline
        from app.data.pubmed_search_queries import SEARCH_TOPICS
        
        pipeline = PubMedIngestionPipeline()
        
        # Decide topic configurations to ingest based on flag
        if topic == "quick":
            selected_topics = SEARCH_TOPICS[:2]
            max_results = 1
        elif topic == "priority":
            selected_topics = [t for t in SEARCH_TOPICS if t.get("priority", "medium") == "high"]
            max_results = 3
        else:
            selected_topics = SEARCH_TOPICS
            max_results = 5
            
        try:
            for topic_config in selected_topics:
                # Set specific limits
                topic_config_with_limit = dict(topic_config)
                topic_config_with_limit["max_per_query"] = max_results
                await pipeline.ingest_topic(topic_config_with_limit, max_results=max_results)
        except Exception as e:
            from app.utils.logger import get_logger
            logger = get_logger("app.api.v1.admin")
            logger.error("Background ingestion failed", error=str(e))
            
    background_tasks.add_task(run_ingestion_async)
    
    return {
        "status": "processing",
        "message": f"PubMed ingestion pipeline started in background for mode: {topic.upper()}."
    }
