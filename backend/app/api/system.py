"""系统设置API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.user import User, Role, OperationLog
from app.schemas.user import UserCreate, UserUpdate, UserResponse, RoleCreate, RoleResponse
from app.schemas.system import OperationLogResponse
from app.api.auth import get_current_user, pwd_context
from datetime import datetime

router = APIRouter(prefix="/api/system", tags=["系统设置"])


# === 用户管理 ===
@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    users = db.query(User).all()
    result = []
    for u in users:
        result.append(UserResponse(
            id=u.id, username=u.username, display_name=u.display_name,
            email=u.email, phone=u.phone, role_id=u.role_id,
            role_name=u.role.name if u.role else None,
            is_active=u.is_active, created_at=u.created_at,
        ))
    return result


@router.post("/users", response_model=UserResponse)
def create_user(data: UserCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = User(
        username=data.username,
        password_hash=pwd_context.hash(data.password),
        display_name=data.display_name,
        email=data.email,
        phone=data.phone,
        role_id=data.role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id, username=user.username, display_name=user.display_name,
        email=user.email, phone=user.phone, role_id=user.role_id,
        role_name=user.role.name if user.role else None,
        is_active=user.is_active, created_at=user.created_at,
    )


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id, username=user.username, display_name=user.display_name,
        email=user.email, phone=user.phone, role_id=user.role_id,
        role_name=user.role.name if user.role else None,
        is_active=user.is_active, created_at=user.created_at,
    )


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(user)
    db.commit()
    return {"message": "已删除"}


# === 角色权限 ===
@router.get("/roles", response_model=list[RoleResponse])
def list_roles(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Role).all()


@router.post("/roles", response_model=RoleResponse)
def create_role(data: RoleCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    role = Role(**data.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    db.delete(role)
    db.commit()
    return {"message": "已删除"}


# === 操作日志 ===
@router.get("/logs", response_model=list[OperationLogResponse])
def list_operation_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(OperationLog).order_by(OperationLog.created_at.desc())
    return query.offset((page - 1) * page_size).limit(page_size).all()
