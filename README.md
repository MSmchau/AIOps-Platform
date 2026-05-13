# AIOps 智能运维平台

基于 **React + TypeScript + Ant Design 5 + FastAPI + SQLAlchemy 2.0 + MySQL** 的全栈智能运维管理平台，覆盖设备管理、告警处置、配置管理、智能巡检、日志分析、AI 智能交互等核心运维场景。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18 + TypeScript + Ant Design 5 + ECharts + Axios | 自研可视化平台，8个核心页面 |
| 后端 | Python + FastAPI + SQLAlchemy 2.0 + Netmiko | RESTful API，异步高并发 |
| 数据库 | MySQL 8.0（生产）/ SQLite（测试） | 结构化运维数据存储 |
| 部署 | Docker Compose（MySQL + Redis + Backend + Frontend） | 一键部署，环境一致 |

## 功能模块

### 1. 控制台大屏（首页）
- 核心指标卡：设备在线率、告警总数（紧急/重要/一般）、自愈成功率、系统可用性、数据采集覆盖率
- ECharts 可视化：设备分布饼图、告警趋势折线图、链路流量 TOP10 柱状图、故障自愈环形图
- 快捷入口：一键跳转各功能模块
- 数据自动刷新（30 秒轮询）

### 2. 设备管理
- 设备 CMDB：列表展示（名称/IP/厂商/型号/状态/CPU/内存/在线时长）
- 多条件筛选：厂商、状态、关键词模糊搜索
- 设备操作：远程执行命令（自定义输入）、配置备份、重启、删除
- 批量操作：勾选多台设备批量备份/重启
- 实时监控：侧边栏 Drawer 展示 CPU/内存趋势 ECharts 图表
- 设备详情：弹窗展示完整配置和硬件信息

### 3. 告警处置
- 告警列表：级别标签（紧急/重要/一般）、处置状态、发生次数
- 智能降噪：AI 算法关联分析，原始/降噪视图切换
- 根因分析：调用 AI 引擎定位故障根因、影响范围、处理建议
- 自动自愈：针对可自愈告警一键触发，实时展示自愈进度
- 告警通知：邮件/企业微信/短信渠道配置与开关

### 4. 配置管理
- 配置备份：手动/定时备份，备份文件下载
- 基线检查：合规基线 CRUD，执行合规比对（合规/违规标记）
- 版本管理：对接 Git 版本历史，版本对比（Diff），一键回滚
- 配置下发：选择目标设备，批量下发配置命令

### 5. 智能巡检
- 巡检任务管理：CRUD、Cron 定时表达式、状态跟踪
- 巡检执行：选择设备范围立即巡检，联动后端 Netmiko
- 结果可视化：合格率统计、异常分布环形图、指标分布柱状图
- 巡检报告：一键生成并下载 TXT 格式报告

### 6. 日志分析
- 多条件检索：设备、类型、级别、关键词、时间范围
- 日志趋势：近 24 小时 ECharts 折线图（按级别区分）
- 语义分析：调用大模型 API 解析异常原因和处理建议
- 异常标记：AI 自动识别异常日志，行标红展示
- 日志导出：支持导出全部/仅异常日志（CSV 格式）

### 7. 智能交互（大模型集成）
- 自然语言排障：输入故障描述，AI 返回根因分析和处理步骤
- 运维知识问答：BGP 配置、端口排查等运维知识库
- 指令下发：AI 解析运维指令，联动 Netmiko 自动执行
- 操作按钮：支持点击一键执行备份/重启等操作
- 快捷提问标签：端口排查、BGP配置、备份配置、全网检查
- 多会话管理：左侧历史会话列表，支持删除

### 8. 系统设置
- 用户管理：CRUD、密码设置、角色分配
- 角色权限：管理员/运维人员/查看人员三级权限
- 采集配置：Telemetry/SNMP 采集周期、日志采集范围
- 部署配置：Docker Compose 运行状态监控
- 系统日志：平台操作审计日志

## 快速开始

### 本地开发

```bash
# 1. 启动 MySQL 数据库（Docker）
docker run -d --name aiops-mysql -e MYSQL_ROOT_PASSWORD=aiops123 -e MYSQL_DATABASE=aiops -p 3306:3306 mysql:8.0

# 2. 启动后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. 启动前端
cd frontend
npm install
npm run dev        # 访问 http://localhost:3000
```

### Docker Compose 部署

```bash
docker-compose up -d
```

- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

### 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| operator | operator123 | 运维人员 |
| viewer | viewer123 | 查看人员 |

## 项目结构

```
AIOps/
├── backend/                        # FastAPI 后端
│   ├── app/
│   │   ├── api/                    # 9 个 API 路由模块
│   │   │   ├── auth.py             # JWT 认证
│   │   │   ├── dashboard.py        # 控制台大屏
│   │   │   ├── devices.py          # 设备管理
│   │   │   ├── alerts.py           # 告警处置
│   │   │   ├── configs.py          # 配置管理
│   │   │   ├── inspections.py      # 智能巡检
│   │   │   ├── logs.py             # 日志分析
│   │   │   ├── chat.py             # 智能交互
│   │   │   └── system.py           # 系统设置
│   │   ├── models/                 # 6 个 SQLAlchemy 模型
│   │   ├── schemas/                # 7 个 Pydantic 校验
│   │   ├── services/               # Netmiko + AI 服务
│   │   ├── config.py               # 配置管理
│   │   ├── database.py             # 数据库引擎
│   │   ├── seed.py                 # 种子数据
│   │   └── main.py                 # 应用入口
│   ├── tests/                      # 14 个 API 测试用例
│   └── Dockerfile
├── frontend/                       # React 前端
│   ├── src/
│   │   ├── pages/                  # 9 个页面组件
│   │   ├── components/             # 通用组件（布局）
│   │   ├── services/               # Axios API 封装
│   │   └── types/                  # TypeScript 类型定义
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml              # 编排部署
└── AIOps智能运维项目实施文档.md        # 实施文档
```

## API 接口概览

| 模块 | 端点 | 功能 |
|------|------|------|
| 认证 | `POST /api/auth/login` | 用户登录 |
| | `GET /api/auth/me` | 当前用户信息 |
| 仪表盘 | `GET /api/dashboard/stats` | 全局统计 |
| 设备 | `GET/POST /api/devices` | 设备列表/新增 |
| | `PUT/DELETE /api/devices/{id}` | 编辑/删除 |
| | `POST /api/devices/{id}/execute` | 执行命令 |
| | `POST /api/devices/{id}/backup` | 备份配置 |
| | `POST /api/devices/{id}/reboot` | 重启设备 |
| 告警 | `GET /api/alerts` | 告警列表 |
| | `POST /api/alerts/{id}/handle` | 处置告警 |
| | `POST /api/alerts/{id}/root-cause` | 根因分析 |
| | `POST /api/alerts/{id}/auto-heal` | 自动自愈 |
| 配置 | `GET /api/configs/backups` | 备份列表 |
| | `POST /api/configs/backups/run` | 执行备份 |
| | `POST /api/configs/deploy` | 配置下发 |
| 巡检 | `GET/POST /api/inspections/tasks` | 任务管理 |
| | `POST /api/inspections/tasks/{id}/run` | 执行巡检 |
| 日志 | `GET /api/logs` | 日志检索 |
| | `GET /api/logs/{id}/analyze` | 语义分析 |
| 交互 | `POST /api/chat` | AI 对话 |
| | `GET /api/chat/history` | 历史记录 |
| 系统 | `GET/POST /api/system/users` | 用户管理 |
| | `GET /api/system/roles` | 角色管理 |

## 测试验证

```bash
# 后端测试（14 个用例）
cd backend && pytest tests/ -v

# 前端 TypeScript 检查
cd frontend && npx tsc --noEmit

# 前端构建
cd frontend && npm run build
```

## License

MIT
