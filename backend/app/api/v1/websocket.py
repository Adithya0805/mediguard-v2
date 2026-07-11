import uuid
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.utils.websocket_manager import ws_manager
from app.schemas.websocket import AgentEvent, AgentEventType
from app.utils.logger import get_logger

logger = get_logger("app.api.v1.websocket")
router = APIRouter()

async def heartbeat_sender(session_id: str):
    """Sends a heartbeat every 15 seconds to keep the connection alive."""
    try:
        while True:
            await asyncio.sleep(15)
            logger.debug("Sending heartbeat to session", session_id=session_id)
            await ws_manager.send_heartbeat(session_id)
    except asyncio.CancelledError:
        logger.debug("Heartbeat task cancelled for session", session_id=session_id)
    except Exception as e:
        logger.warning("Heartbeat sender encountered an error", session_id=session_id, error=str(e))

async def simulate_pipeline_events(session_id: str):
    """Simulates a full clinical pipeline run with mock events for frontend testing."""
    logger.info("Starting clinical pipeline simulation", session_id=session_id)
    try:
        # 1. Pipeline Started
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.PIPELINE_STARTED,
                session_id=session_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="MediGuard AI pipeline initiated",
                data={
                    "total_agents": 5,
                    "agents_sequence": ["intake", "symptom", "diagnosis", "drug_check", "report"]
                }
            )
        )
        await asyncio.sleep(2)

        # 2. Intake Started
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_STARTED,
                session_id=session_id,
                agent_name="intake",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Intake Agent parsing patient data...",
                data={
                    "agent_display_name": "Intake Agent",
                    "agent_icon": "clipboard-list",
                    "estimated_seconds": 8
                }
            )
        )
        await asyncio.sleep(2)

        # 3. Intake Completed
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_COMPLETED,
                session_id=session_id,
                agent_name="intake",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Intake Agent completed",
                data={
                    "duration_seconds": 2.0,
                    "intake_confidence": 0.94
                }
            )
        )
        await asyncio.sleep(2)

        # 4. Symptom Started
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_STARTED,
                session_id=session_id,
                agent_name="symptom",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Symptom Agent is analyzing...",
                data={
                    "agent_display_name": "Symptom Agent",
                    "agent_icon": "activity",
                    "estimated_seconds": 12
                }
            )
        )
        await asyncio.sleep(2)

        # 5. Symptom Completed
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_COMPLETED,
                session_id=session_id,
                agent_name="symptom",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Symptom Agent completed",
                data={
                    "duration_seconds": 2.0,
                    "symptom_severity": "moderate"
                }
            )
        )
        await asyncio.sleep(2)

        # 6. Diagnosis Started
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_STARTED,
                session_id=session_id,
                agent_name="diagnosis",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Diagnosis Agent is analyzing...",
                data={
                    "agent_display_name": "Diagnosis Agent",
                    "agent_icon": "search",
                    "estimated_seconds": 20
                }
            )
        )
        await asyncio.sleep(2)

        # 7. Diagnosis Completed
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_COMPLETED,
                session_id=session_id,
                agent_name="diagnosis",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Diagnosis Agent completed",
                data={
                    "duration_seconds": 2.0,
                    "ddx_count": 3
                }
            )
        )
        await asyncio.sleep(2)

        # 8. Drug Started
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_STARTED,
                session_id=session_id,
                agent_name="drug_check",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Drug Agent is analyzing...",
                data={
                    "agent_display_name": "Drug Agent",
                    "agent_icon": "pill",
                    "estimated_seconds": 8
                }
            )
        )
        await asyncio.sleep(2)

        # 9. Drug Completed
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_COMPLETED,
                session_id=session_id,
                agent_name="drug_check",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Drug Agent completed",
                data={
                    "duration_seconds": 2.0,
                    "interactions_found": 0
                }
            )
        )
        await asyncio.sleep(2)

        # 10. Report Started
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_STARTED,
                session_id=session_id,
                agent_name="report",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Report Agent is compiling report...",
                data={
                    "agent_display_name": "Report Agent",
                    "agent_icon": "file-text",
                    "estimated_seconds": 15
                }
            )
        )
        await asyncio.sleep(2)

        # 11. Report Completed
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.AGENT_COMPLETED,
                session_id=session_id,
                agent_name="report",
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Report Agent completed",
                data={
                    "duration_seconds": 2.0,
                    "urgency_level": "medium"
                }
            )
        )
        await asyncio.sleep(2)

        # 12. Pipeline Completed
        await ws_manager.broadcast_to_session(
            session_id,
            AgentEvent(
                event_type=AgentEventType.PIPELINE_COMPLETED,
                session_id=session_id,
                timestamp=datetime.now(timezone.utc).isoformat(),
                message="Clinical analysis complete. Report ready.",
                data={
                    "total_duration_seconds": 22.0,
                    "urgency_level": "medium",
                    "primary_diagnosis": "Stable Angina",
                    "ddx_count": 3,
                    "report_generated": True
                }
            )
        )
        logger.info("Clinical pipeline simulation completed successfully", session_id=session_id)
    except Exception as e:
        logger.error("Error running simulation", session_id=session_id, error=str(e))

@router.websocket("/ws/session/{session_id}")
async def websocket_session_endpoint(websocket: WebSocket, session_id: str):
    # Validate session_id is a valid UUID format (skip check for 'test-123' mock session)
    if session_id != "test-123":
        try:
            uuid.UUID(session_id)
        except ValueError:
            logger.warning("Invalid UUID format presented for WebSocket session connection", session_id=session_id)
            # 1008 is Policy Violation
            await websocket.close(code=1008)
            return

    # Register connection in ws_manager
    await ws_manager.connect(websocket, session_id)
    
    # Start heartbeat background task
    heartbeat_task = asyncio.create_task(heartbeat_sender(session_id))

    try:
        while True:
            # Wait for any text inputs
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            elif data == "simulate":
                # Run the simulation in background task
                asyncio.create_task(simulate_pipeline_events(session_id))
    except WebSocketDisconnect:
        logger.info("WebSocket connection disconnected by client", session_id=session_id)
    except Exception as e:
        logger.error("Error in WebSocket session loop", session_id=session_id, error=str(e))
    finally:
        # Stop the heartbeat sender task
        heartbeat_task.cancel()
        # Clean up connection
        await ws_manager.disconnect(websocket, session_id)

