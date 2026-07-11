from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class AgentEventType(str, Enum):
    PIPELINE_STARTED = "pipeline_started"
    AGENT_STARTED = "agent_started"
    AGENT_COMPLETED = "agent_completed"
    AGENT_FAILED = "agent_failed"
    PIPELINE_COMPLETED = "pipeline_completed"
    PIPELINE_FAILED = "pipeline_failed"
    HEARTBEAT = "heartbeat"

class AgentEvent(BaseModel):
    event_type: AgentEventType
    session_id: str
    agent_name: Optional[str] = None
    timestamp: str  # UTC ISO format
    data: Dict[str, Any] = Field(default_factory=dict)
    message: str = ""
