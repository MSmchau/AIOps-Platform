"""设备CMDB模型"""
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base
import enum


class DeviceStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    FAULT = "fault"


class DeviceVendor(str, enum.Enum):
    HUAWEI = "华为"
    H3C = "H3C"
    CISCO = "思科"


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="设备名称")
    ip_address = Column(String(50), nullable=False, unique=True, comment="管理IP")
    vendor = Column(String(50), nullable=False, comment="厂商")
    model = Column(String(100), nullable=True, comment="设备型号")
    device_type = Column(String(50), default="switch", comment="设备类型:switch/router/firewall")
    status = Column(String(20), default=DeviceStatus.ONLINE.value, comment="状态")
    ssh_port = Column(Integer, default=22)
    ssh_username = Column(String(100), nullable=True)
    ssh_password = Column(String(255), nullable=True)
    enable_password = Column(String(255), nullable=True)
    snmp_community = Column(String(100), nullable=True)
    cpu_usage = Column(Float, default=0.0, comment="CPU使用率")
    memory_usage = Column(Float, default=0.0, comment="内存使用率")
    online_duration = Column(Integer, default=0, comment="在线时长(分钟)")
    location = Column(String(255), nullable=True, comment="位置")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
