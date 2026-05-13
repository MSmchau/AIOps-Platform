"""诊断调试API - 仅用于部署后问题排查"""
from fastapi import APIRouter
from app.database import engine, SessionLocal
from app.models.user import User, Role
from app.seed import seed_data
from sqlalchemy import text

router = APIRouter(prefix="/api/debug", tags=["诊断调试"])


@router.get("/health")
def debug_health():
    """详细健康检查，包含数据库状态"""
    result = {
        "status": "ok",
        "db_connected": False,
        "user_count": 0,
        "tables_exist": False,
    }
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            result["db_connected"] = True
        db = SessionLocal()
        try:
            result["user_count"] = db.query(User).count()
            result["tables_exist"] = True
        except Exception:
            result["tables_exist"] = False
        finally:
            db.close()
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
    return result


@router.post("/seed")
def debug_seed():
    """手动执行种子数据初始化"""
    from app.database import init_db
    try:
        init_db()
        seed_data()
        db = SessionLocal()
        user_count = db.query(User).count()
        role_count = db.query(Role).count()
        db.close()
        return {"status": "ok", "users": user_count, "roles": role_count}
    except Exception as e:
        return {"status": "error", "error": str(e)}
