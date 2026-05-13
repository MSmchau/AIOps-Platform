"""系统设置Schema"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SystemConfigUpdate(BaseModel):
    key: str
    value: str


class SystemConfigResponse(BaseModel):
    id: int
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class OperationLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    target: Optional[str] = None
    detail: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    device_online_rate: float
    total_alerts: int
    critical_alerts: int
    major_alerts: int
    warning_alerts: int
    auto_recovery_rate: float
    system_availability: float
    collection_coverage: float
    device_distribution: list
    alert_trend: list
    traffic_top: list
    recovery_stats: dict
