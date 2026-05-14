"""智能巡检API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.monitor import InspectionTask, InspectionResult
from app.models.device import Device
from app.models.user import User
from app.schemas.monitor import InspectionTaskCreate, InspectionTaskResponse, InspectionResultResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/inspections", tags=["智能巡检"])


@router.get("/tasks", response_model=list[InspectionTaskResponse])
def list_tasks(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(InspectionTask).order_by(InspectionTask.created_at.desc()).all()


@router.post("/tasks", response_model=InspectionTaskResponse)
def create_task(data: InspectionTaskCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    task = InspectionTask(**data.model_dump(), status="idle")
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    task = db.query(InspectionTask).filter(InspectionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    db.delete(task)
    db.commit()
    return {"message": "已删除"}


@router.post("/tasks/{task_id}/run", response_model=list[InspectionResultResponse])
def run_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    task = db.query(InspectionTask).filter(InspectionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    task.status = "running"
    db.commit()

    import json
    scope = json.loads(task.scope) if task.scope else []
    indicators = json.loads(task.indicators) if task.indicators else ["cpu", "memory", "interface"]

    results = []
    if scope:
        devices = db.query(Device).filter(Device.id.in_(scope)).all()
    else:
        devices = db.query(Device).limit(10).all()

    for device in devices:
        for indicator in indicators:
            import random
            threshold_val = random.choice([80, 90, 95])
            current_val = random.uniform(10, 100)
            status = "abnormal" if current_val > threshold_val else "normal"
            result = InspectionResult(
                task_id=task_id,
                device_id=device.id,
                device_name=device.name,
                indicator=indicator,
                value=f"{current_val:.1f}",
                threshold=f"{threshold_val}",
                status=status,
                detail=f"{device.name}的{indicator}指标当前值{current_val:.1f}，阈值{threshold_val}",
            )
            db.add(result)
            results.append(result)

    task.status = "completed"
    task.last_run_at = datetime.now(timezone.utc)
    db.commit()
    return results


@router.get("/results", response_model=list[InspectionResultResponse])
def list_results(
    task_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(InspectionResult)
    if task_id:
        query = query.filter(InspectionResult.task_id == task_id)
    if status:
        query = query.filter(InspectionResult.status == status)
    query = query.order_by(InspectionResult.inspected_at.desc())
    return query.offset((page - 1) * page_size).limit(page_size).all()
