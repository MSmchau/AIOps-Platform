"""仪表盘/首页API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.device import Device
from app.models.alert import Alert
from app.api.auth import get_current_user
from app.models.user import User
from app.schemas.system import DashboardResponse

router = APIRouter(prefix="/api/dashboard", tags=["仪表盘"])


@router.get("/stats", response_model=DashboardResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total_devices = db.query(func.count(Device.id)).scalar() or 1
    online_count = db.query(func.count(Device.id)).filter(Device.status == "online").scalar() or 0
    fault_count = db.query(func.count(Device.id)).filter(Device.status == "fault").scalar() or 0
    device_online_rate = round(online_count / max(total_devices, 1) * 100, 2)

    total_alerts = db.query(func.count(Alert.id)).scalar() or 0
    critical = db.query(func.count(Alert.id)).filter(Alert.level == "critical").scalar() or 0
    major = db.query(func.count(Alert.id)).filter(Alert.level == "major").scalar() or 0
    warning = db.query(func.count(Alert.id)).filter(Alert.level == "warning").scalar() or 0

    resolved = db.query(func.count(Alert.id)).filter(Alert.status == "resolved").scalar() or 0
    auto_recovery_rate = round(resolved / max(total_alerts, 1) * 100, 2)

    # 设备分布
    vendor_counts = db.query(Device.vendor, func.count(Device.id)).group_by(Device.vendor).all()
    device_distribution = [{"name": v, "value": c} for v, c in vendor_counts]

    # 近7天告警趋势
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    trend_data = (
        db.query(
            func.date(Alert.created_at).label("date"),
            Alert.level,
            func.count(Alert.id),
        )
        .filter(Alert.created_at >= seven_days_ago)
        .group_by(func.date(Alert.created_at), Alert.level)
        .all()
    )
    alert_trend = [{"date": str(r.date), "level": r.level, "count": r[2]} for r in trend_data]

    # 链路流量TOP10（模拟）
    traffic_top = [
        {"name": f"链路-{chr(65+i)}", "traffic": round(100 + i * 50 + (i * 20) % 300, 1)}
        for i in range(10)
    ]

    recovery_stats = {
        "success": resolved,
        "failed": total_alerts - resolved,
        "rate": auto_recovery_rate,
    }

    return DashboardResponse(
        device_online_rate=device_online_rate,
        total_alerts=total_alerts,
        critical_alerts=critical,
        major_alerts=major,
        warning_alerts=warning,
        auto_recovery_rate=auto_recovery_rate,
        system_availability=99.95,
        collection_coverage=96.50,
        device_distribution=device_distribution,
        alert_trend=alert_trend,
        traffic_top=traffic_top,
        recovery_stats=recovery_stats,
    )
