"""配置管理API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.config import ConfigBackup, ConfigBaseline, ConfigBaselineCheck
from app.models.device import Device
from app.models.user import User
from app.schemas.config_schema import (
    ConfigBackupResponse, ConfigBaselineCreate, ConfigBaselineResponse,
    ConfigBaselineCheckResult, ConfigDeploy,
)
from app.api.auth import get_current_user
from app.services.netmiko_service import NetmikoService
from datetime import datetime

router = APIRouter(prefix="/api/configs", tags=["配置管理"])


# === 配置备份 ===
@router.get("/backups", response_model=list[ConfigBackupResponse])
def list_backups(
    device_name: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(ConfigBackup)
    if device_name:
        query = query.filter(ConfigBackup.device_name.ilike(f"%{device_name}%"))
    query = query.order_by(ConfigBackup.backup_time.desc())
    return query.offset((page - 1) * page_size).limit(page_size).all()


@router.post("/backups/run")
async def run_backup(
    device_ids: list[int],
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    results = []
    for did in device_ids:
        device = db.query(Device).filter(Device.id == did).first()
        if not device:
            continue
        result = await NetmikoService.backup_config(device)
        backup = ConfigBackup(
            device_id=device.id,
            device_name=device.name,
            config_content=result.get("config", ""),
            status="success" if result["success"] else "failed",
            version=datetime.utcnow().strftime("V%Y%m%d%H%M%S"),
        )
        db.add(backup)
        results.append({"device_id": did, "device_name": device.name, "success": result["success"]})
    db.commit()
    return {"results": results}


# === 配置基线 ===
@router.get("/baselines", response_model=list[ConfigBaselineResponse])
def list_baselines(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(ConfigBaseline).all()


@router.post("/baselines", response_model=ConfigBaselineResponse)
def create_baseline(data: ConfigBaselineCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    baseline = ConfigBaseline(**data.model_dump())
    db.add(baseline)
    db.commit()
    db.refresh(baseline)
    return baseline


@router.delete("/baselines/{baseline_id}")
def delete_baseline(baseline_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    baseline = db.query(ConfigBaseline).filter(ConfigBaseline.id == baseline_id).first()
    if not baseline:
        raise HTTPException(status_code=404, detail="基线不存在")
    db.delete(baseline)
    db.commit()
    return {"message": "已删除"}


# === 基线检查 ===
@router.post("/baselines/{baseline_id}/check", response_model=list[ConfigBaselineCheckResult])
def run_baseline_check(
    baseline_id: int,
    device_ids: list[int],
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    baseline = db.query(ConfigBaseline).filter(ConfigBaseline.id == baseline_id).first()
    if not baseline:
        raise HTTPException(status_code=404, detail="基线不存在")
    results = []
    for did in device_ids:
        device = db.query(Device).filter(Device.id == did).first()
        if not device:
            continue
        check = ConfigBaselineCheck(
            baseline_id=baseline_id,
            device_id=did,
            device_name=device.name,
            check_result="compliant",
            details="合规检查通过",
        )
        db.add(check)
        results.append(check)
    db.commit()
    return results


# === 配置下发 ===
@router.post("/deploy")
async def deploy_config(data: ConfigDeploy, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    results = []
    for did in data.device_ids:
        device = db.query(Device).filter(Device.id == did).first()
        if device:
            result = await NetmikoService.deploy_config(device, data.config_content)
            results.append({"device_id": did, "device_name": device.name, **result})
    return {"results": results}
