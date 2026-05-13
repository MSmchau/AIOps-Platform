"""智能交互（大模型集成）API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.monitor import ChatHistory
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, ChatHistoryResponse
from app.api.auth import get_current_user
from app.services.ai_service import AIService
import uuid

router = APIRouter(prefix="/api/chat", tags=["智能交互"])


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_id = req.session_id or str(uuid.uuid4())

    # 保存用户消息
    user_msg = ChatHistory(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    db.commit()

    # 获取AI回复
    reply_content = await AIService.chat_with_llm(req.message)

    # 保存AI回复
    assistant_msg = ChatHistory(
        user_id=current_user.id,
        session_id=session_id,
        role="assistant",
        content=reply_content,
    )
    db.add(assistant_msg)
    db.commit()

    # 解析可能的动作
    actions = None
    if "备份" in req.message or "backup" in req.message.lower():
        actions = [{"type": "backup", "label": "执行配置备份", "command": "backup_all"}]
    elif "重启" in req.message or "reboot" in req.message.lower():
        actions = [{"type": "reboot", "label": "确认重启", "command": "reboot_device"}]

    return ChatResponse(reply=reply_content, session_id=session_id, actions=actions)


@router.get("/history", response_model=list[ChatHistoryResponse])
def get_chat_history(
    session_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id)
    if session_id:
        query = query.filter(ChatHistory.session_id == session_id)
    query = query.order_by(ChatHistory.created_at.asc())
    return query.all()


@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy import func
    sessions = (
        db.query(
            ChatHistory.session_id,
            func.min(ChatHistory.created_at).label("created_at"),
            func.max(ChatHistory.created_at).label("last_message"),
            func.count(ChatHistory.id).label("message_count"),
        )
        .filter(ChatHistory.user_id == current_user.id)
        .group_by(ChatHistory.session_id)
        .order_by(func.max(ChatHistory.created_at).desc())
        .all()
    )
    return [
        {
            "session_id": s.session_id,
            "created_at": s.created_at,
            "last_message": s.last_message,
            "message_count": s.message_count,
        }
        for s in sessions
    ]


@router.delete("/history/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(ChatHistory).filter(
        ChatHistory.session_id == session_id,
        ChatHistory.user_id == current_user.id,
    ).delete()
    db.commit()
    return {"message": "已删除"}
