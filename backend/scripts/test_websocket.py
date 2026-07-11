import asyncio
import json
import sys
import os
from datetime import datetime

# Add the backend directory to sys.path so we can import app modules if run locally
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def simulate_pipeline_events(session_id: str):
    """
    Directly broadcasts mock pipeline events to the ws_manager.
    This can be imported and executed in the application context.
    """
    try:
        from app.utils.websocket_manager import ws_manager
        from app.schemas.websocket import AgentEvent, AgentEventType
    except ImportError:
        print("[Simulation Error] Could not import app modules. Make sure Python path is set correctly.")
        return

    from datetime import timezone
    print(f"[Simulation] Starting simulation broadcast for session: {session_id}")

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
    print(f"[Simulation] Simulation complete for session: {session_id}")

async def run_client(uri: str):
    """WebSocket client that connects, sends a ping, triggers simulation, and listens to events."""
    try:
        import websockets
    except ImportError:
        print("[Client Error] 'websockets' package is not installed. Please run: pip install websockets")
        return

    print(f"Connecting to WebSocket: {uri}")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Sending 'ping'...")
            await websocket.send("ping")
            
            response = await websocket.recv()
            print(f"Received response: {response}")
            if response == "pong":
                print("Ping/pong validated successfully!")
            
            print("\nTriggering pipeline simulation by sending 'simulate' command...")
            await websocket.send("simulate")
            
            print("Listening for streamed events for 60 seconds (Ctrl+C to exit)...\n")
            
            start_time = asyncio.get_event_loop().time()
            
            while True:
                if asyncio.get_event_loop().time() - start_time > 60:
                    print("Test finished (60 seconds elapsed).")
                    break
                    
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    if message == "pong":
                        continue
                    
                    event = json.loads(message)
                    
                    # Print formatted log: [HH:MM:SS] EVENT_TYPE | agent: NAME | message
                    timestamp_str = event.get("timestamp", "")
                    try:
                        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                        time_str = dt.strftime("%H:%M:%S")
                    except Exception:
                        time_str = datetime.now().strftime("%H:%M:%S")
                        
                    event_type = event.get("event_type", "").upper()
                    agent_name = event.get("agent_name") or "N/A"
                    msg = event.get("message", "")
                    data = event.get("data", {})
                    
                    print(f"[{time_str}] {event_type:<18} | agent: {agent_name:<10} | {msg}")
                    if data:
                        print(f"      Context Data: {data}")
                        
                except asyncio.TimeoutError:
                    continue
                except websockets.exceptions.ConnectionClosed:
                    print("WebSocket connection was closed by the server.")
                    break
    except Exception as e:
        print(f"WebSocket client error: {e}")

if __name__ == "__main__":
    session_id = "test-123"
    if len(sys.argv) > 1:
        session_id = sys.argv[1]
        
    server_url = f"ws://localhost:8000/ws/session/{session_id}"
    if len(sys.argv) > 2:
        server_url = sys.argv[2]
        
    try:
        asyncio.run(run_client(server_url))
    except KeyboardInterrupt:
        print("\nDisconnected cleanly.")
