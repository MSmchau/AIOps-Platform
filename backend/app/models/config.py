"""配置管理相关模型"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ConfigBackup(Base):
    __tablename__ = "config_backups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    device_name = Column(String(100), nullable=True)
    config_content = Column(Text, nullable=True, comment="配置内容")
    backup_time = Column(DateTime, server_default=func.now(), comment="备份时间")
    status = Column(String(20), default="success", comment="success/failed")
    version = Column(String(50), nullable=True, comment="版本号")
    file_path = Column(String(500), nullable=True, comment="备份文件路径")
    created_at = Column(DateTime, server_default=func.now())

    device = relationship("Device")


class ConfigBaseline(Base):
    __tablename__ = "config_baselines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="基线名称")
    device_type = Column(String(50), nullable=True, comment="适用设备类型")
    content = Column(Text, nullable=False, comment="基线配置内容")
    rules = Column(Text, nullable=True, comment="检查规则(JSON)")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ConfigBaselineCheck(Base):
    __tablename__ = "config_baseline_checks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    baseline_id = Column(Integer, ForeignKey("config_baselines.id"), nullable=False)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    device_name = Column(String(100), nullable=True)
    check_result = Column(String(20), default="compliant", comment="compliant/violated")
    details = Column(Text, nullable=True, comment="检查详情(JSON)")
    checked_at = Column(DateTime, server_default=func.now())

    baseline = relationship("ConfigBaseline")
    device = relationship("Device")
