"""告警相关模型"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(String(50), unique=True, nullable=False, comment="告警ID")
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    device_name = Column(String(100), nullable=True)
    device_ip = Column(String(50), nullable=True)
    level = Column(String(20), default="warning", comment="级别:critical/major/warning/info")
    title = Column(String(255), nullable=False, comment="告警标题")
    content = Column(Text, nullable=True, comment="告警内容")
    alert_type = Column(String(50), default="system", comment="告警类型")
    status = Column(String(20), default="open", comment="状态:open/processing/resolved/closed")
    source = Column(String(50), default="system", comment="告警来源")
    is_auto_recovery = Column(Boolean, default=False, comment="是否可自愈")
    recovery_status = Column(String(20), nullable=True, comment="自愈状态")
    root_cause = Column(Text, nullable=True, comment="根因分析")
    handling_suggestion = Column(Text, nullable=True, comment="处理建议")
    handled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    handled_at = Column(DateTime, nullable=True)
    handler_notes = Column(Text, nullable=True)
    occurrence_count = Column(Integer, default=1, comment="发生次数")
    first_occurred = Column(DateTime, server_default=func.now())
    last_occurred = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    device = relationship("Device")


class AlertNotificationConfig(Base):
    __tablename__ = "alert_notification_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    method = Column(String(50), nullable=False, comment="email/wecom/sms")
    webhook_url = Column(String(500), nullable=True)
    recipients = Column(Text, nullable=True, comment="接收人配置")
    enable = Column(Boolean, default=True)
    min_level = Column(String(20), default="warning")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
