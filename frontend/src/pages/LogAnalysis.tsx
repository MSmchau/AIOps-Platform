import { useState, useEffect } from 'react'
import { Table, Card, Input, Select, Space, Button, Tag, message, Row, Col, Statistic, Modal } from 'antd'
import { DownloadOutlined, AlertOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { logApi } from '../services/api'
import type { LogEntry } from '../types'
import ReactEChartsCore from 'echarts-for-react'

const levelMap: Record<string, { color: string; label: string }> = {
  info: { color: 'blue', label: '信息' },
  warning: { color: 'orange', label: '警告' },
  error: { color: 'red', label: '错误' },
  critical: { color: '#f5222d', label: '严重' },
};

export default function LogAnalysis() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', log_type: '', level: '' });
  const [trend, setTrend] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try { const res = await logApi.list(filters); setLogs(res.data); } catch { message.error('获取日志失败'); }
    finally { setLoading(false); }
  };

  const fetchTrend = async () => {
    try { const res = await logApi.trend(); setTrend(res.data); } catch { /* ignore */ }
  };

  useEffect(() => { fetchLogs(); fetchTrend(); }, [filters]);

  const handleAnalyze = async (log: LogEntry) => {
    setAnalyzing(true);
    try {
      const res = await logApi.analyze(log.id);
      Modal.info({
        title: '日志语义分析结果',
        content: (
          <div>
            <p><strong>日志内容：</strong>{log.content}</p>
            <p><strong>是否异常：</strong>{res.data.is_anomaly ? <Tag color="red">是</Tag> : <Tag color="green">否</Tag>}</p>
            <p><strong>异常分数：</strong>{res.data.anomaly_score}</p>
            <p><strong>分析结论：</strong>{res.data.reason}</p>
          </div>
        ),
        width: 500,
      });
    } catch { message.error('分析失败'); }
    finally { setAnalyzing(false); }
  };

  const handleExport = (anomalyOnly = false) => {
    const dataToExport = anomalyOnly ? logs.filter(l => l.is_anomaly) : logs;
    if (dataToExport.length === 0) { message.warning('没有可导出的日志'); return; }

    let content = '时间\t设备\t类型\t级别\t内容\t异常\n';
    dataToExport.forEach(l => {
      content += `${l.logged_at}\t${l.device_name || '-'}\t${l.log_type}\t${l.level}\t${l.content}\t${l.is_anomaly ? '是' : '否'}\n`;
    });

    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `日志导出_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    message.success(`已导出 ${dataToExport.length} 条日志`);
  };

  const columns = [
    { title: '时间', dataIndex: 'logged_at', key: 'logged_at', width: 170, render: (v: string) => v?.replace('T', ' ')?.slice(0, 19) },
    { title: '设备', dataIndex: 'device_name', key: 'device_name' },
    { title: '类型', dataIndex: 'log_type', key: 'log_type', render: (t: string) => ({ system: '系统', device: '设备', business: '业务' })[t] || t },
    { title: '级别', dataIndex: 'level', key: 'level', render: (l: string) => <Tag color={levelMap[l]?.color}>{levelMap[l]?.label || l}</Tag> },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '异常', dataIndex: 'is_anomaly', key: 'is_anomaly', render: (v: boolean) => v ? <Tag color="red">异常</Tag> : <Tag color="green">正常</Tag> },
    {
      title: '操作', key: 'action',
      render: (_: any, record: LogEntry) => <Button size="small" onClick={() => handleAnalyze(record)} loading={analyzing}>语义分析</Button>,
    },
  ];

  const trendOption = {
    title: { text: '近24小时日志趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: [...new Set(trend.map((t: any) => t.time))] },
    yAxis: { type: 'value' },
    series: ['info', 'warning', 'error'].map(level => ({
      name: level, type: 'line', smooth: true,
      data: [...new Set(trend.map((t: any) => t.time))].map(time =>
        trend.find((t: any) => t.time === time && t.level === level)?.count || 0
      ),
    })),
    legend: { data: ['info', 'warning', 'error'], bottom: 0 },
  };

  const abnormalLogs = logs.filter(l => l.is_anomaly);
  const errorLogs = logs.filter(l => l.level === 'error' || l.level === 'critical');

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="日志总量" value={logs.length} suffix="条" /></Card></Col>
        <Col span={6}><Card><Statistic title="异常日志" value={abnormalLogs.length} suffix="条" valueStyle={{ color: '#f5222d' }} prefix={<AlertOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="错误日志" value={errorLogs.length} suffix="条" valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="异常率" value={logs.length ? ((abnormalLogs.length / logs.length) * 100).toFixed(1) : 0} suffix="%" valueStyle={{ color: abnormalLogs.length > 0 ? '#f5222d' : '#52c41a' }} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card><ReactEChartsCore option={trendOption} style={{ height: 250 }} /></Card>
        </Col>
      </Row>
      <Card style={{ margin: '16px 0' }}>
        <Space wrap>
          <Input.Search placeholder="搜索日志关键词" allowClear style={{ width: 250 }} onSearch={(v) => setFilters(p => ({ ...p, keyword: v }))} />
          <Select placeholder="日志类型" allowClear style={{ width: 130 }} onChange={(v) => setFilters(p => ({ ...p, log_type: v || '' }))}
            options={[{ value: 'system', label: '系统日志' }, { value: 'device', label: '设备日志' }, { value: 'business', label: '业务日志' }]} />
          <Select placeholder="级别" allowClear style={{ width: 120 }} onChange={(v) => setFilters(p => ({ ...p, level: v || '' }))}
            options={[{ value: 'info', label: '信息' }, { value: 'warning', label: '警告' }, { value: 'error', label: '错误' }]} />
          <Button icon={<DownloadOutlined />} onClick={() => handleExport(false)}>导出全部</Button>
          {abnormalLogs.length > 0 && (
            <Button icon={<ExclamationCircleOutlined />} onClick={() => handleExport(true)} danger>
              导出异常日志 ({abnormalLogs.length})
            </Button>
          )}
          <Button onClick={fetchLogs}>刷新</Button>
        </Space>
      </Card>
      <Table rowKey="id" columns={columns} dataSource={logs} loading={loading}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条日志` }}
        scroll={{ x: 1000 }}
        rowClassName={(record) => record.is_anomaly ? 'ant-table-row-error' : ''}
      />
      <style>{`
        .ant-table-row-error td { background-color: #fff1f0 !important; }
        .ant-table-row-error:hover td { background-color: #ffccc7 !important; }
      `}</style>
    </div>
  );
}
