"""设备管理API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.device import Device
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceBatchCommand
from app.api.auth import get_current_user
from app.services.netmiko_service import NetmikoService

router = APIRouter(prefix="/api/devices", tags=["设备管理"])


@router.get("", response_model=list[DeviceResponse])
def list_devices(
    vendor: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    device_type: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Device)
    if vendor:
        query = query.filter(Device.vendor == vendor)
    if status:
        query = query.filter(Device.status == status)
    if device_type:
        query = query.filter(Device.device_type == device_type)
    if keyword:
        query = query.filter(
            Device.name.ilike(f"%{keyword}%") | Device.ip_address.ilike(f"%{keyword}%")
        )
    total = query.count()
    devices = query.offset((page - 1) * page_size).limit(page_size).all()
    return devices


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device


@router.post("", response_model=DeviceResponse)
def create_device(data: DeviceCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    existing = db.query(Device).filter(Device.ip_address == data.ip_address).first()
    if existing:
        raise HTTPException(status_code=400, detail="该IP地址已存在")
    device = Device(**data.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: int, data: DeviceUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(device, key, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    db.delete(device)
    db.commit()
    return {"message": "已删除"}


@router.post("/{device_id}/execute")
async def execute_command(
    device_id: int,
    data: dict,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    result = await NetmikoService.execute_command(device, data.get("command", ""))
    return result


@router.post("/{device_id}/backup")
async def backup_device(device_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    result = await NetmikoService.backup_config(device)
    return result


@router.post("/{device_id}/reboot")
async def reboot_device(device_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    result = await NetmikoService.reboot_device(device)
    return result


@router.post("/batch/execute")
async def batch_execute(data: DeviceBatchCommand, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    results = []
    for did in data.device_ids:
        device = db.query(Device).filter(Device.id == did).first()
        if device:
            result = await NetmikoService.execute_command(device, data.command)
            results.append({"device_id": did, "device_name": device.name, **result})
    return {"results": results}
