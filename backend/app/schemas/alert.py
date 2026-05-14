"""告警相关Schema"""
from pydantic import ConfigDict, BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AlertFilter(BaseModel):
    level: Optional[str] = None
    device_name: Optional[str] = None
    status: Optional[str] = None
    alert_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class AlertHandle(BaseModel):
    handler_notes: Optional[str] = None
    status: str = Field(default="resolved")


class AlertResponse(BaseModel):
    id: int
    alert_id: str
    device_id: Optional[int]
    device_name: Optional[str] = None
    device_ip: Optional[str] = None
    level: str
    title: str
    content: Optional[str] = None
    alert_type: str
    status: str
    is_auto_recovery: bool
    recovery_status: Optional[str] = None
    root_cause: Optional[str] = None
    handling_suggestion: Optional[str] = None
    occurrence_count: int
    first_occurred: datetime
    last_occurred: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertNotificationConfigCreate(BaseModel):
    name: str
    method: str
    webhook_url: Optional[str] = None
    recipients: Optional[str] = None
    min_level: str = "warning"


class AlertNotificationConfigResponse(BaseModel):
    id: int
    name: str
    method: str
    webhook_url: Optional[str] = None
    recipients: Optional[str] = None
    enable: bool
    min_level: str

    model_config = ConfigDict(from_attributes=True)
