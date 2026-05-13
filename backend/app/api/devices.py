"""设备管理API"""
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.device import Device
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceBatchCommand
from app.api.auth import get_current_user
from app.services.netmiko_service import NetmikoService
from datetime import datetime

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


@router.post("/import")
async def import_devices(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """批量导入设备（CSV格式）"""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="请上传CSV文件")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    required_fields = {"name", "ip_address", "vendor"}
    if not required_fields.issubset(reader.fieldnames or []):
        raise HTTPException(status_code=400, detail=f"CSV缺少必要列: {required_fields}")

    imported = 0
    errors = []
    for i, row in enumerate(reader, start=1):
        try:
            if not row.get("name") or not row.get("ip_address") or not row.get("vendor"):
                errors.append(f"第{i}行: 缺少必填字段(name/ip_address/vendor)")
                continue

            existing = db.query(Device).filter(Device.ip_address == row["ip_address"]).first()
            if existing:
                errors.append(f"第{i}行: IP {row['ip_address']} 已存在")
                continue

            device = Device(
                name=row["name"],
                ip_address=row["ip_address"],
                vendor=row["vendor"],
                model=row.get("model", ""),
                device_type=row.get("device_type", "switch"),
                status=row.get("status", "online"),
                location=row.get("location", ""),
                description=row.get("description", ""),
            )
            db.add(device)
            imported += 1
        except Exception as e:
            errors.append(f"第{i}行: {str(e)}")

    db.commit()
    return {
        "imported": imported,
        "errors": errors,
        "total": imported + len(errors),
    }


@router.get("/export")
def export_devices(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """批量导出设备为CSV"""
    devices = db.query(Device).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "ip_address", "vendor", "model", "device_type", "status",
                      "cpu_usage", "memory_usage", "location", "description"])

    for d in devices:
        writer.writerow([
            d.name, d.ip_address, d.vendor, d.model or "", d.device_type,
            d.status, d.cpu_usage, d.memory_usage, d.location or "", d.description or "",
        ])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=devices_{datetime.utcnow().strftime('%Y%m%d')}.csv"},
    )
