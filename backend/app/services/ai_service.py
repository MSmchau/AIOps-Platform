"""AI算法与智能分析服务（模拟）"""
import random
import json
from typing import Optional


class AIService:
    """模拟AI算法服务，包括告警降噪、根因分析、日志异常检测等"""

    @staticmethod
    def noise_reduction(alerts: list) -> dict:
        """告警降噪 - 基于关联规则压缩告警"""
        if not alerts:
            return {"original_count": 0, "reduced_count": 0, "groups": []}

        # 按设备分组模拟降噪
        device_groups = {}
        for alert in alerts:
            dev = getattr(alert, "device_name", None) or "unknown"
            if dev not in device_groups:
                device_groups[dev] = []
            device_groups[dev].append(alert)

        groups = []
        for dev, dev_alerts in device_groups.items():
            if len(dev_alerts) > 1:
                groups.append({
                    "device": dev,
                    "alert_count": len(dev_alerts),
                    "root_alert": dev_alerts[0].title if hasattr(dev_alerts[0], "title") else "unknown",
                    "compressed": True,
                })

        return {
            "original_count": len(alerts),
            "reduced_count": len(groups),
            "reduction_rate": round((1 - len(groups) / max(len(alerts), 1)) * 100, 2),
            "groups": groups,
        }

    @staticmethod
    def root_cause_analysis(alert) -> dict:
        """根因分析"""
        causes = {
            "port_down": "物理链路故障或光模块异常",
            "cpu_high": "设备负载过高，可能存在广播风暴或业务量突增",
            "memory_high": "内存泄漏或路由表过大",
            "link_flap": "物理端口不稳定，检查光模块和光纤",
            "config_error": "配置变更导致协议邻居中断",
        }
        alert_title = getattr(alert, "title", "") or ""
        cause_key = "port_down"
        for key in causes:
            if key in alert_title.lower():
                cause_key = key
                break

        return {
            "root_cause": causes[cause_key],
            "confidence": round(random.uniform(0.75, 0.98), 2),
            "impact_scope": f"影响{random.randint(1, 5)}台下游设备",
            "suggestion": f"建议检查相关{cause_key.replace('_', '')}配置和物理状态",
            "related_alerts": random.randint(1, 8),
        }

    @staticmethod
    def anomaly_detection(log_content: str) -> dict:
        """日志异常检测"""
        error_keywords = ["error", "fail", "down", "critical", "异常", "故障", "断开"]
        is_anomaly = any(kw in log_content.lower() for kw in error_keywords)
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(random.uniform(0.6, 0.99), 2) if is_anomaly else round(random.uniform(0.01, 0.3), 2),
            "reason": "检测到异常关键词" if is_anomaly else "日志正常",
        }

    @staticmethod
    def predict_fault(device_metrics: dict) -> dict:
        """故障预测"""
        cpu = device_metrics.get("cpu_usage", 0)
        memory = device_metrics.get("memory_usage", 0)
        risk = "high" if cpu > 80 or memory > 80 else "medium" if cpu > 60 or memory > 60 else "low"
        return {
            "risk_level": risk,
            "prediction": f"CPU使用率{cpu}%，内存使用率{memory}%",
            "suggested_action": "建议进行扩容或负载均衡" if risk == "high" else "当前状态正常" if risk == "low" else "建议监控观察",
            "probability": round(random.uniform(0.3, 0.9), 2),
        }

    @staticmethod
    async def chat_with_llm(message: str, history: Optional[list] = None) -> str:
        """模拟大模型对话"""
        message_lower = message.lower()
        responses = {
            "端口": "端口故障排查步骤：\n1. 检查端口状态：display interface brief\n2. 检查光模块：display transceiver interface\n3. 检查端口统计：display interface counters\n4. 如为物理层故障，需现场检查光模块和光纤",
            "bgp": "BGP配置步骤：\n1. 创建BGP进程：bgp {AS号}\n2. 配置Router-ID：router-id {IP地址}\n3. 建立对等体：peer {对端IP} as-number {对端AS}\n4. 激活IPv4单播：address-family ipv4 unicast",
            "备份": "配置备份已执行！已将当前配置备份至备份服务器。\n备份文件：config_backup_{date}.cfg\n可通过「配置管理」页面查看和下载备份文件。",
            "重启": "设备重启指令已确认。\n⚠️ 警告：该操作将中断业务，请在维护窗口执行。\n建议先备份配置并确认无关键业务运行。",
            "检查": "全网设备检查结果：\n- 在线设备：42台\n- 离线设备：3台\n- 故障设备：1台\n- 异常告警：7条\n建议优先处理故障设备：SW-Core-01",
        }
        for keyword, response in responses.items():
            if keyword in message:
                return response
        return f"已收到您的问题：「{message}」\n\n我正在分析，请稍候。您可以尝试描述具体的故障现象或询问运维操作步骤，我会为您提供详细的排查指导。"
