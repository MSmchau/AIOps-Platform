"""配置管理Schema"""
from pydantic import ConfigDict, BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ConfigBackupResponse(BaseModel):
    id: int
    device_id: int
    device_name: Optional[str] = None
    backup_time: datetime
    status: str
    version: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConfigBaselineCreate(BaseModel):
    name: str = Field(..., max_length=100)
    device_type: Optional[str] = None
    content: str
    rules: Optional[str] = None


class ConfigBaselineResponse(BaseModel):
    id: int
    name: str
    device_type: Optional[str] = None
    content: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConfigBaselineCheckResult(BaseModel):
    id: int
    baseline_id: int
    device_id: int
    device_name: Optional[str] = None
    check_result: str
    details: Optional[str] = None
    checked_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConfigDeploy(BaseModel):
    device_ids: List[int] = Field(..., min_length=1)
    config_content: str = Field(..., min_length=1)
