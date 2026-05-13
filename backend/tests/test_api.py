"""后端API测试"""
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.database import engine, Base, SessionLocal
from app.models.user import User, Role
from app.models.device import Device
from app.models.alert import Alert
from app.models.monitor import InspectionTask, LogEntry
from app.models.config import ConfigBackup, ConfigBaseline
from passlib.context import CryptContext
import pytest
import uuid
import os

# 创建测试用FastAPI应用（不含lifespan）
from app.api import auth, dashboard, devices, alerts, configs, inspections, logs, chat, system

test_app = FastAPI(title="AIOps-Test")
from fastapi.middleware.cors import CORSMiddleware
test_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
test_app.include_router(auth.router)
test_app.include_router(dashboard.router)
test_app.include_router(devices.router)
test_app.include_router(alerts.router)
test_app.include_router(configs.router)
test_app.include_router(inspections.router)
test_app.include_router(logs.router)
test_app.include_router(chat.router)
test_app.include_router(system.router)


@test_app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "AIOps-Test"}


client = TestClient(test_app)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """每个测试前重置数据库"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin_role = Role(name="admin", permissions='{}', description="管理员")
        db.add(admin_role)
        db.flush()

        admin = User(
            username="admin", password_hash=pwd_context.hash("admin123"),
            display_name="管理员", role_id=admin_role.id, is_active=True,
        )
        db.add(admin)
        db.flush()

        device = Device(name="Test-SW-01", ip_address="192.168.1.1", vendor="华为",
                        model="CE12808", device_type="switch", status="online",
                        cpu_usage=45.0, memory_usage=62.0)
        db.add(device)
        db.flush()

        alert = Alert(alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                      device_id=device.id, device_name=device.name,
                      level="critical", title="测试告警", status="open", is_auto_recovery=True)
        db.add(alert)

        log = LogEntry(device_id=device.id, device_name=device.name,
                       content="测试日志 - 系统运行正常", level="info")
        db.add(log)

        task = InspectionTask(name="测试巡检任务", status="idle")
        db.add(task)

        backup = ConfigBackup(device_id=device.id, device_name=device.name,
                              status="success", version="V20240101")
        db.add(backup)

        baseline = ConfigBaseline(name="测试基线", content="test config", is_active=True)
        db.add(baseline)

        db.commit()
    finally:
        db.close()
    yield


def get_token():
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


class TestBasic:
    def test_health(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_get_me(self):
        token = get_token()
        resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200


class TestAuth:
    def test_login_success(self):
        resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_failed(self):
        resp = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
        assert resp.status_code == 401


class TestDashboard:
    def test_stats(self):
        token = get_token()
        resp = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "device_online_rate" in data
        assert "total_alerts" in data


class TestDevices:
    def test_list(self):
        token = get_token()
        resp = client.get("/api/devices", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    def test_create(self):
        token = get_token()
        resp = client.post("/api/devices", json={
            "name": "NewSW", "ip_address": "10.0.0.1", "vendor": "思科",
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200

    def test_execute(self):
        token = get_token()
        resp = client.post("/api/devices/1/execute", json={"command": "display version"},
                           headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200


class TestAlerts:
    def test_list(self):
        token = get_token()
        resp = client.get("/api/alerts", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    def test_root_cause(self):
        token = get_token()
        resp = client.post("/api/alerts/1/root-cause", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200


class TestChat:
    def test_chat(self):
        token = get_token()
        resp = client.post("/api/chat", json={"message": "端口down排查"},
                           headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200

    def test_history(self):
        token = get_token()
        headers = {"Authorization": f"Bearer {token}"}
        client.post("/api/chat", json={"message": "test"}, headers=headers)
        resp = client.get("/api/chat/history", headers=headers)
        assert resp.status_code == 200


class TestSystem:
    def test_users(self):
        token = get_token()
        resp = client.get("/api/system/users", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200

    def test_create_user(self):
        token = get_token()
        resp = client.post("/api/system/users", json={
            "username": "testuser", "password": "pass123", "display_name": "测试",
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
