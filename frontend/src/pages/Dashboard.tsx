import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Badge, Spin, message, Button, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CloudServerOutlined, BellOutlined, CheckCircleOutlined, ApiOutlined, RadarChartOutlined, DesktopOutlined, AuditOutlined, FileSearchOutlined, ToolOutlined, MessageOutlined } from '@ant-design/icons'
import ReactEChartsCore from 'echarts-for-react'
import { dashboardApi } from '../services/api'
import type { DashboardStats } from '../types'

const levelColors: Record<string, string> = { critical: '#f5222d', major: '#fa8c16', warning: '#faad14', info: '#1677ff' };

export default function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await dashboardApi.stats();
        setData(res.data);
      } catch { message.error('获取仪表盘数据失败'); }
      finally { setLoading(false); }
    };
    fetchData();
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !data) return <Spin style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} size="large" />;

  const pieOption = {
    title: { text: '设备状态分布', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: data.device_distribution.map((d: any) => ({ name: d.name, value: d.value })),
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
    }],
  };

  const trendOption = {
    title: { text: '近7天告警趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: [...new Set(data.alert_trend.map((t: any) => t.date))] },
    yAxis: { type: 'value' },
    legend: { data: ['critical', 'major', 'warning'], bottom: 0 },
    series: ['critical', 'major', 'warning'].map(level => ({
      name: level, type: 'line', smooth: true,
      data: [...new Set(data.alert_trend.map((t: any) => t.date))].map(date =>
        data.alert_trend.find((t: any) => t.date === date && t.level === level)?.count || 0
      ),
      lineStyle: { color: levelColors[level] },
      itemStyle: { color: levelColors[level] },
    })),
  };

  const barOption = {
    title: { text: '链路流量TOP10', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.traffic_top.map((t: any) => t.name) },
    yAxis: { type: 'value', name: '流量(Mbps)' },
    series: [{ type: 'bar', data: data.traffic_top.map((t: any) => t.traffic), itemStyle: { color: '#1677ff' } }],
  };

  const ringOption = {
    title: { text: '故障自愈统计', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: [
        { name: '自愈成功', value: data.recovery_stats.success, itemStyle: { color: '#52c41a' } },
        { name: '自愈失败', value: data.recovery_stats.failed, itemStyle: { color: '#f5222d' } },
      ],
    }],
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable><Statistic title="设备在线率" value={data.device_online_rate} suffix="%" prefix={<CloudServerOutlined />} valueStyle={{ color: data.device_online_rate > 90 ? '#3f8600' : '#cf1322' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic title="告警总数" value={data.total_alerts} prefix={<BellOutlined />} />
            <div style={{ marginTop: 8 }}>
              <Badge color="#f5222d" text={`紧急 ${data.critical_alerts}`} style={{ marginRight: 12 }} />
              <Badge color="#fa8c16" text={`重要 ${data.major_alerts}`} style={{ marginRight: 12 }} />
              <Badge color="#faad14" text={`一般 ${data.warning_alerts}`} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable><Statistic title="自愈成功率" value={data.auto_recovery_rate} suffix="%" prefix={<CheckCircleOutlined />} valueStyle={{ color: data.auto_recovery_rate > 80 ? '#3f8600' : '#cf1322' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable><Statistic title="核心系统可用性" value={data.system_availability} suffix="%" prefix={<ApiOutlined />} valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable><Statistic title="数据采集覆盖率" value={data.collection_coverage} suffix="%" prefix={<RadarChartOutlined />} valueStyle={{ color: data.collection_coverage > 90 ? '#3f8600' : '#cf1322' }} /></Card>
        </Col>
      </Row>
      {/* 快捷入口区 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="快捷入口" size="small">
            <Space wrap size="large">
              <Button type="text" icon={<DesktopOutlined />} size="large" onClick={() => navigate('/devices')}>设备管理</Button>
              <Button type="text" icon={<BellOutlined />} size="large" onClick={() => navigate('/alerts')}>告警处置</Button>
              <Button type="text" icon={<AuditOutlined />} size="large" onClick={() => navigate('/configs')}>配置备份</Button>
              <Button type="text" icon={<FileSearchOutlined />} size="large" onClick={() => navigate('/inspections')}>巡检报告</Button>
              <Button type="text" icon={<MessageOutlined />} size="large" onClick={() => navigate('/chat')}>智能交互</Button>
              <Button type="text" icon={<ToolOutlined />} size="large" onClick={() => navigate('/logs')}>日志分析</Button>
            </Space>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}><Card><ReactEChartsCore option={pieOption} style={{ height: 300 }} /></Card></Col>
        <Col xs={24} lg={12}><Card><ReactEChartsCore option={trendOption} style={{ height: 300 }} /></Card></Col>
        <Col xs={24} lg={12}><Card><ReactEChartsCore option={barOption} style={{ height: 300 }} /></Card></Col>
        <Col xs={24} lg={12}><Card><ReactEChartsCore option={ringOption} style={{ height: 300 }} /></Card></Col>
      </Row>
    </div>
  );
}
