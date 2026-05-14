"""智能交互Chat Schema"""
from pydantic import ConfigDict, BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    actions: Optional[List[dict]] = None


class ChatHistoryResponse(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    message_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
