from typing import Dict, List
from fastapi import WebSocket
from app.utils.logger import get_logger
from app.schemas.websocket import AgentEvent, AgentEventType

logger = get_logger("app.utils.websocket_manager")

class ConnectionManager:
    """
    Manages active WebSocket connections and event history per clinical session.
    Allows broadcasting agent state transition events in real-time.
    """

    def __init__(self) -> None:
        # Map session_id to list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Map session_id to list of past events (max 50 events)
        self.session_events: Dict[str, List[AgentEvent]] = {}

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """Accepts the WebSocket connection and sends the session's event history."""
        await websocket.accept()
        
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        
        logger.info(
            "New WebSocket client connected to session",
            session_id=session_id,
            total_active_connections=len(self.active_connections[session_id])
        )

        # Replay past events to help the late-connecting client catch up
        if session_id in self.session_events:
            for event in self.session_events[session_id]:
                try:
                    await websocket.send_text(event.model_dump_json())
                except Exception as e:
                    logger.warning(
                        "Failed to replay session event history to client",
                        session_id=session_id,
                        error=str(e)
                    )

    async def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        """Removes the WebSocket client and cleans up structures if empty."""
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        
        logger.info(
            "WebSocket client disconnected from session",
            session_id=session_id
        )

    async def broadcast_to_session(self, session_id: str, event: AgentEvent) -> None:
        """
        Stores the event in history and broadcasts it to all connected clients.
        Handles disconnected clients gracefully.
        """
        # Store event in session history
        if session_id not in self.session_events:
            self.session_events[session_id] = []
        
        # Max history: 50 events
        self.session_events[session_id].append(event)
        if len(self.session_events[session_id]) > 50:
            self.session_events[session_id].pop(0)

        # Broadcast to all active websockets in this session
        if session_id in self.active_connections:
            dead_connections = []
            for websocket in self.active_connections[session_id]:
                try:
                    await websocket.send_text(event.model_dump_json())
                except Exception as e:
                    logger.warning(
                        "Error sending message to websocket, marking as dead",
                        session_id=session_id,
                        error=str(e)
                    )
                    dead_connections.append(websocket)
            
            # Clean up dead connections
            for dead_ws in dead_connections:
                await self.disconnect(dead_ws, session_id)

        logger.info(
            "WebSocket broadcast complete",
            session_id=session_id,
            event_type=event.event_type,
            active_clients=self.get_connection_count(session_id)
        )

    async def send_heartbeat(self, session_id: str) -> None:
        """Generates and broadcasts a heartbeat event for a session."""
        from datetime import datetime, timezone
        event = AgentEvent(
            event_type=AgentEventType.HEARTBEAT,
            session_id=session_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            message="heartbeat"
        )
        await self.broadcast_to_session(session_id, event)

    def get_connection_count(self, session_id: str) -> int:
        """Returns the current number of active connections for a session."""
        return len(self.active_connections.get(session_id, []))

# Export singleton
ws_manager = ConnectionManager()
