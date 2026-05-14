"""种子数据脚本"""
from app.database import SessionLocal
from app.models.user import User, Role
from app.models.device import Device
from app.models.alert import Alert
from app.models.config import ConfigBackup, ConfigBaseline
from app.models.monitor import InspectionTask, LogEntry, ChatHistory
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
import random
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_data():
    """初始化种子数据"""
    db = SessionLocal()
    try:
        # 检查是否已有数据
        if db.query(User).count() > 0:
            return

        # === 角色 ===
        roles = [
            Role(name="admin", permissions='{"pages":["all"],"actions":["all"]}', description="管理员"),
            Role(name="operator", permissions='{"pages":["dashboard","devices","alerts","configs","inspections","logs","chat"],"actions":["read","write"]}', description="运维人员"),
            Role(name="viewer", permissions='{"pages":["dashboard","alerts","logs"],"actions":["read"]}', description="查看人员"),
        ]
        db.add_all(roles)
        db.flush()

        # === 用户 ===
        users = [
            User(username="admin", password_hash=pwd_context.hash("admin123"), display_name="系统管理员", email="admin@aiops.com", role_id=roles[0].id, is_active=True),
            User(username="operator", password_hash=pwd_context.hash("operator123"), display_name="运维工程师", email="operator@aiops.com", role_id=roles[1].id, is_active=True),
            User(username="viewer", password_hash=pwd_context.hash("viewer123"), display_name="观察员", email="viewer@aiops.com", role_id=roles[2].id, is_active=True),
        ]
        db.add_all(users)
        db.flush()

        # === 设备 ===
        devices_data = [
            {"name": "SW-Core-01", "ip_address": "192.168.1.1", "vendor": "华为", "model": "CE12808", "device_type": "switch", "cpu_usage": 45.2, "memory_usage": 62.8, "online_duration": 43200},
            {"name": "SW-Core-02", "ip_address": "192.168.1.2", "vendor": "华为", "model": "CE12808", "device_type": "switch", "cpu_usage": 38.5, "memory_usage": 55.3, "online_duration": 43200},
            {"name": "SW-Agg-01", "ip_address": "192.168.2.1", "vendor": "H3C", "model": "S5560X", "device_type": "switch", "cpu_usage": 52.1, "memory_usage": 71.5, "online_duration": 41500},
            {"name": "SW-Agg-02", "ip_address": "192.168.2.2", "vendor": "H3C", "model": "S5560X", "device_type": "switch", "cpu_usage": 28.3, "memory_usage": 45.6, "online_duration": 41000},
            {"name": "SW-Access-01", "ip_address": "192.168.3.1", "vendor": "华为", "model": "S5735S", "device_type": "switch", "cpu_usage": 35.8, "memory_usage": 52.2, "online_duration": 40000},
            {"name": "SW-Access-02", "ip_address": "192.168.3.2", "vendor": "思科", "model": "C9300", "device_type": "switch", "cpu_usage": 72.3, "memory_usage": 81.0, "online_duration": 38000, "status": "fault"},
            {"name": "FW-Main", "ip_address": "192.168.0.1", "vendor": "华为", "model": "USG6650", "device_type": "firewall", "cpu_usage": 55.6, "memory_usage": 68.4, "online_duration": 43200},
            {"name": "Router-Main", "ip_address": "192.168.0.2", "vendor": "思科", "model": "ISR4451", "device_type": "router", "cpu_usage": 42.1, "memory_usage": 58.7, "online_duration": 42800},
            {"name": "SW-DMZ-01", "ip_address": "192.168.4.1", "vendor": "H3C", "model": "S5130S", "device_type": "switch", "cpu_usage": 22.5, "memory_usage": 35.2, "online_duration": 39000},
            {"name": "SW-Core-03", "ip_address": "192.168.1.3", "vendor": "华为", "model": "CE6851", "device_type": "switch", "cpu_usage": 31.2, "memory_usage": 48.9, "online_duration": 42000},
        ]
        devices = []
        for d in devices_data:
            device = Device(**d)
            db.add(device)
            devices.append(device)
        db.flush()

        # === 告警 ===
        now = datetime.now(timezone.utc)
        alerts_data = [
            Alert(alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}", device_id=devices[1].id, device_name=devices[1].name, device_ip=devices[1].ip_address, level="critical", title="核心交换机CPU过载", content=f"{devices[1].name} CPU使用率持续超过95%", alert_type="system", status="open", is_auto_recovery=True, first_occurred=now - timedelta(hours=2), last_occurred=now),
            Alert(alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}", device_id=devices[5].id, device_name=devices[5].name, device_ip=devices[5].ip_address, level="critical", title="设备离线告警", content=f"{devices[5].name} 已离线超过30分钟", alert_type="system", status="open", is_auto_recovery=False, first_occurred=now - timedelta(hours=5), last_occurred=now - timedelta(minutes=30)),
            Alert(alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}", device_id=devices[0].id, device_name=devices[0].name, device_ip=devices[0].ip_address, level="major", title="端口down告警", content=f"{devices[0].name} GigabitEthernet0/0/2 端口 down", alert_type="network", status="processing", is_auto_recovery=True, first_occurred=now - timedelta(minutes=45), last_occurred=now - timedelta(minutes=15)),
            Alert(alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}", device_id=devices[7].id, device_name=devices[7].name, device_ip=devices[7].ip_address, level="warning", title="BGP邻居振荡", content=f"{devices[7].name} BGP邻居 10.0.0.1 状态频繁切换", alert_type="network", status="open", is_auto_recovery=True, first_occurred=now - timedelta(hours=3), last_occurred=now - timedelta(minutes=10)),
            Alert(alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}", device_id=devices[6].id, device_name=devices[6].name, device_ip=devices[6].ip_address, level="warning", title="防火墙会话数超阈值", content=f"{devices[6].name} 并发会话数达到上限的85%", alert_type="system", status="open", is_auto_recovery=True, first_occurred=now - timedelta(hours=1), last_occurred=now - timedelta(minutes=5)),
            Alert(alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}", device_id=devices[2].id, device_name=devices[2].name, device_ip=devices[2].ip_address, level="major", title="内存使用率过高", content=f"{devices[2].name} 内存使用率 91.5%，超过阈值90%", alert_type="system", status="open", is_auto_recovery=False, first_occurred=now - timedelta(minutes=30), last_occurred=now),
            Alert(alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}", device_id=devices[3].id, device_name=devices[3].name, device_ip=devices[3].ip_address, level="info", title="配置变更告警", content=f"{devices[3].name} 配置于 {now.strftime('%Y-%m-%d %H:%M')} 发生变更", alert_type="config", status="resolved", is_auto_recovery=False, first_occurred=now - timedelta(days=1), last_occurred=now - timedelta(hours=12), handled_at=now - timedelta(hours=10)),
        ]
        db.add_all(alerts_data)

        # === 配置备份 ===
        for device in devices[:5]:
            db.add(ConfigBackup(
                device_id=device.id,
                device_name=device.name,
                config_content=f"sysname {device.name}\n#\ninterface GigabitEthernet0/0/0\n ip address {device.ip_address} 255.255.255.0\n#\nreturn\n",
                status="success",
                version=f"V{now.strftime('%Y%m%d%H%M%S')}",
            ))

        # === 配置基线 ===
        db.add(ConfigBaseline(name="交换机安全基线", device_type="switch", content="interface GigabitEthernet0/0/0\n port-security enable\n storm-control broadcast", is_active=True))
        db.add(ConfigBaseline(name="防火墙安全基线", device_type="firewall", content="firewall zone trust\n set priority 85", is_active=True))

        # === 巡检任务 ===
        db.add(InspectionTask(name="每日全网巡检", scope=None, indicators='["cpu","memory","interface","temperature"]', cron_expr="0 2 * * *", is_active=True, status="idle"))
        db.add(InspectionTask(name="核心设备巡检", scope=json.dumps([1, 2, 8, 9]), indicators='["cpu","memory","interface"]', cron_expr="0 */4 * * *", is_active=True, status="idle"))

        # === 日志 ===
        log_types = ["system", "device", "business"]
        log_levels = ["info", "info", "info", "warning", "error"]
        for i in range(100):
            device = random.choice(devices)
            level = random.choice(log_levels)
            db.add(LogEntry(
                device_id=device.id,
                device_name=device.name,
                log_type=random.choice(log_types),
                level=level,
                content=f"{['系统运行正常', '端口状态变更', '用户登录成功', '配置保存完成', '链路抖动告警', 'CPU使用率波动', '内存回收完成', 'NTP时间同步'][i % 8]} - {device.name}",
                is_anomaly=(level in ["error"]),
                logged_at=now - timedelta(minutes=random.randint(0, 1440)),
            ))

        db.commit()
        print(f"[Seed] 数据库初始化完成 - 角色:{len(roles)} 用户:{len(users)} 设备:{len(devices)} 告警:{len(alerts_data)}")
    except Exception as e:
        db.rollback()
        print(f"[Seed] 初始化错误: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


import json  # noqa: E402
