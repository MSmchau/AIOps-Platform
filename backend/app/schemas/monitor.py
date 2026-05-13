"""监控、巡检、日志Schema"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class InspectionTaskCreate(BaseModel):
    name: str = Field(..., max_length=100)
    scope: Optional[str] = None
    indicators: Optional[str] = None
    cron_expr: Optional[str] = None


class InspectionTaskResponse(BaseModel):
    id: int
    name: str
    scope: Optional[str] = None
    indicators: Optional[str] = None
    cron_expr: Optional[str] = None
    is_active: bool
    status: str
    last_run_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InspectionResultResponse(BaseModel):
    id: int
    device_id: int
    device_name: Optional[str] = None
    indicator: str
    value: Optional[str] = None
    threshold: Optional[str] = None
    status: str
    detail: Optional[str] = None
    inspected_at: datetime

    class Config:
        from_attributes = True


class LogFilter(BaseModel):
    device_name: Optional[str] = None
    log_type: Optional[str] = None
    level: Optional[str] = None
    keyword: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class LogResponse(BaseModel):
    id: int
    device_id: Optional[int] = None
    device_name: Optional[str] = None
    log_type: str
    level: str
    content: str
    is_anomaly: bool
    anomaly_reason: Optional[str] = None
    logged_at: datetime

    class Config:
        from_attributes = True
