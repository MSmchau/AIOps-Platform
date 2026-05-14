"""告警处置API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.alert import Alert, AlertNotificationConfig
from app.models.user import User
from app.schemas.alert import AlertFilter, AlertHandle, AlertResponse, AlertNotificationConfigCreate, AlertNotificationConfigResponse
from app.api.auth import get_current_user
from app.services.ai_service import AIService
import uuid

router = APIRouter(prefix="/api/alerts", tags=["告警处置"])


@router.get("", response_model=list[AlertResponse])
def list_alerts(
    level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    device_name: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Alert)
    if level:
        query = query.filter(Alert.level == level)
    if status:
        query = query.filter(Alert.status == status)
    if device_name:
        query = query.filter(Alert.device_name.ilike(f"%{device_name}%"))
    query = query.order_by(Alert.created_at.desc())
    total = query.count()
    alerts = query.offset((page - 1) * page_size).limit(page_size).all()
    return alerts


@router.get("/{alert_id}/detail", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")
    return alert


@router.post("/{alert_id}/handle")
def handle_alert(
    alert_id: int,
    data: AlertHandle,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")
    alert.status = data.status
    alert.handled_by = current_user.id
    alert.handled_at = datetime.now(timezone.utc)
    alert.handler_notes = data.handler_notes
    db.commit()
    return {"message": "处置成功"}


@router.post("/{alert_id}/auto-heal")
async def auto_heal(alert_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")
    if not alert.is_auto_recovery:
        # 模拟自愈
        alert.recovery_status = "success"
        alert.status = "resolved"
        db.commit()
    return {
        "success": True,
        "message": f"告警 {alert.alert_id} 自动自愈成功",
        "steps": [
            "1. 检测到端口异常",
            "2. 执行端口重置",
            "3. 等待30秒",
            "4. 确认端口恢复",
        ],
    }


@router.post("/{alert_id}/root-cause")
def root_cause_analysis(alert_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")
    result = AIService.root_cause_analysis(alert)
    alert.root_cause = result["root_cause"]
    alert.handling_suggestion = result["suggestion"]
    db.commit()
    return result


@router.get("/noise-reduction")
def noise_reduction(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    alerts = db.query(Alert).filter(Alert.status == "open").limit(page_size).all()
    result = AIService.noise_reduction(alerts)
    return result


# 告警通知配置
@router.get("/notification-configs", response_model=list[AlertNotificationConfigResponse])
def list_notification_configs(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(AlertNotificationConfig).all()


@router.post("/notification-configs", response_model=AlertNotificationConfigResponse)
def create_notification_config(data: AlertNotificationConfigCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    config = AlertNotificationConfig(name=data.name, method=data.method, webhook_url=data.webhook_url, recipients=data.recipients, min_level=data.min_level)
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.put("/notification-configs/{config_id}/toggle")
def toggle_notification(config_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    config = db.query(AlertNotificationConfig).filter(AlertNotificationConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    config.enable = not config.enable
    db.commit()
    return {"enable": config.enable}
