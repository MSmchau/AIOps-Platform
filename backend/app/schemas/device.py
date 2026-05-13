"""设备相关Schema"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class DeviceCreate(BaseModel):
    name: str = Field(..., max_length=100, description="设备名称")
    ip_address: str = Field(..., description="管理IP")
    vendor: str = Field(..., description="厂商")
    model: Optional[str] = None
    device_type: str = Field(default="switch")
    ssh_port: int = Field(default=22, ge=1, le=65535)
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    enable_password: Optional[str] = None
    snmp_community: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

    @field_validator("ip_address")
    @classmethod
    def validate_ip(cls, v: str) -> str:
        import re
        if not re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", v):
            raise ValueError("无效的IP地址格式")
        return v


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    vendor: Optional[str] = None
    model: Optional[str] = None
    device_type: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    enable_password: Optional[str] = None
    snmp_community: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None


class DeviceResponse(BaseModel):
    id: int
    name: str
    ip_address: str
    vendor: str
    model: Optional[str] = None
    device_type: str
    status: str
    cpu_usage: float
    memory_usage: float
    online_duration: int
    location: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeviceBatchCommand(BaseModel):
    device_ids: List[int] = Field(..., min_length=1)
    command: str = Field(..., min_length=1, max_length=1000)
