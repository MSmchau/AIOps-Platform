"""数据库引擎和会话管理"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

is_sqlite = settings.database_url.startswith("sqlite")
engine = create_engine(
    settings.database_url,
    **(dict(connect_args={"check_same_thread": False}) if is_sqlite else dict(
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
    )),
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """创建所有表"""
    Base.metadata.create_all(bind=engine)
