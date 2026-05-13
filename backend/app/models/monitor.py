"""巡检与日志相关模型"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class InspectionTask(Base):
    __tablename__ = "inspection_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="任务名称")
    scope = Column(Text, nullable=True, comment="巡检范围(设备ID列表)")
    indicators = Column(Text, nullable=True, comment="巡检指标(JSON)")
    cron_expr = Column(String(100), nullable=True, comment="Cron表达式")
    is_active = Column(Boolean, default=True)
    status = Column(String(20), default="idle", comment="idle/running/completed")
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class InspectionResult(Base):
    __tablename__ = "inspection_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("inspection_tasks.id"), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    device_name = Column(String(100), nullable=True)
    indicator = Column(String(100), nullable=False, comment="巡检指标")
    value = Column(String(255), nullable=True, comment="当前值")
    threshold = Column(String(255), nullable=True, comment="阈值")
    status = Column(String(20), default="normal", comment="normal/abnormal")
    detail = Column(Text, nullable=True)
    inspected_at = Column(DateTime, server_default=func.now())

    task = relationship("InspectionTask")
    device = relationship("Device")


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    device_name = Column(String(100), nullable=True)
    log_type = Column(String(50), default="system", comment="system/device/business")
    level = Column(String(20), default="info", comment="info/warning/error/critical")
    content = Column(Text, nullable=False)
    source = Column(String(100), nullable=True)
    is_anomaly = Column(Boolean, default=False, comment="是否异常")
    anomaly_reason = Column(Text, nullable=True)
    logged_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    device = relationship("Device")


class ChatHistory(Base):
    __tablename__ = "chat_histories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String(50), nullable=False, comment="会话ID")
    role = Column(String(20), nullable=False, comment="user/assistant")
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text", comment="text/command/result")
    metadata_json = Column(Text, nullable=True, comment="额外信息(JSON)")
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
