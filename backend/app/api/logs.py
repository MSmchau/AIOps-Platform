"""日志分析API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.monitor import LogEntry
from app.models.user import User
from app.schemas.monitor import LogFilter, LogResponse
from app.api.auth import get_current_user
from app.services.ai_service import AIService
from datetime import datetime, timezone

router = APIRouter(prefix="/api/logs", tags=["日志分析"])


@router.get("", response_model=list[LogResponse])
def list_logs(
    device_name: Optional[str] = Query(None),
    log_type: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(LogEntry)
    if device_name:
        query = query.filter(LogEntry.device_name.ilike(f"%{device_name}%"))
    if log_type:
        query = query.filter(LogEntry.log_type == log_type)
    if level:
        query = query.filter(LogEntry.level == level)
    if keyword:
        query = query.filter(LogEntry.content.ilike(f"%{keyword}%"))
    query = query.order_by(LogEntry.logged_at.desc())
    return query.offset((page - 1) * page_size).limit(page_size).all()


@router.get("/{log_id}/analyze")
def analyze_log(log_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    log_entry = db.query(LogEntry).filter(LogEntry.id == log_id).first()
    if not log_entry:
        raise HTTPException(status_code=404, detail="日志不存在")

    result = AIService.anomaly_detection(log_entry.content)
    log_entry.is_anomaly = result["is_anomaly"]
    log_entry.anomaly_reason = result.get("reason", "")
    db.commit()

    return result


@router.get("/trend")
def get_log_trend(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from sqlalchemy import func, text
    from datetime import timedelta
    from app.config import settings

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    is_sqlite = settings.database_url.startswith("sqlite")

    if is_sqlite:
        hour_expr = func.strftime("%Y-%m-%d %H:00", LogEntry.logged_at).label("hour")
    else:
        hour_expr = func.date_format(LogEntry.logged_at, "%%Y-%%m-%%d %%H:00").label("hour")

    data = (
        db.query(hour_expr, LogEntry.level, func.count(LogEntry.id))
        .filter(LogEntry.logged_at >= since)
        .group_by("hour", LogEntry.level)
        .all()
    )
    trend = [{"time": r.hour, "level": r.level, "count": r[2]} for r in data]
    return trend
