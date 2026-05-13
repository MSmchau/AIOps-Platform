"""FastAPI主应用"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.seed import seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时初始化数据库和种子数据"""
    init_db()
    seed_data()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
from app.api import auth, dashboard, devices, alerts, configs, inspections, logs, chat, system, debug
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(devices.router)
app.include_router(alerts.router)
app.include_router(configs.router)
app.include_router(inspections.router)
app.include_router(logs.router)
app.include_router(chat.router)
app.include_router(system.router)
app.include_router(debug.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
