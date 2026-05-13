import { useState, useEffect } from 'react'
import { Table, Card, Tag, Space, Button, Select, Modal, Input, message, Statistic, Row, Col, Badge, Steps, Drawer, Switch, Form, Divider } from 'antd'
import { alertApi } from '../services/api'
import type { Alert } from '../types'

const levelConfig: Record<string, { color: string; label: string }> = {
  critical: { color: '#f5222d', label: '紧急' },
  major: { color: '#fa8c16', label: '重要' },
  warning: { color: '#faad14', label: '一般' },
  info: { color: '#1677ff', label: '提示' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  open: { color: 'red', label: '未处置' },
  processing: { color: 'processing', label: '处置中' },
  resolved: { color: 'success', label: '已处置' },
  closed: { color: 'default', label: '已关闭' },
};

export default function AlertManagement() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ level: '', status: '' });
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [healingVisible, setHealingVisible] = useState(false);
  const [healingSteps, setHealingSteps] = useState<string[]>([]);
  const [noiseData, setNoiseData] = useState<any>(null);
  const [showReduced, setShowReduced] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [notifConfigs, setNotifConfigs] = useState<any[]>([]);
  const [notifForm] = Form.useForm();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await alertApi.list(filters);
      setAlerts(res.data);
    } catch { message.error('获取告警列表失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, [filters]);

  const fetchNoiseData = async () => {
    try {
      const res = await alertApi.noiseReduction();
      setNoiseData(res.data);
    } catch { message.error('获取降噪数据失败'); }
  };

  const fetchNotifConfigs = async () => {
    try {
      const res = await alertApi.notifConfigs();
      setNotifConfigs(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchNoiseData(); fetchNotifConfigs(); }, []);

  const handleRootCause = async (alert: Alert) => {
    try {
      const res = await alertApi.rootCause(alert.id);
      Modal.info({
        title: '根因分析结果',
        content: (
          <div>
            <p><strong>根因：</strong>{res.data.root_cause}</p>
            <p><strong>置信度：</strong>{(res.data.confidence * 100).toFixed(1)}%</p>
            <p><strong>影响范围：</strong>{res.data.impact_scope}</p>
            <p><strong>处理建议：</strong>{res.data.suggestion}</p>
          </div>
        ),
        width: 500,
      });
    } catch { message.error('根因分析失败'); }
  };

  const handleAutoHeal = async (alert: Alert) => {
    try {
      setCurrentAlert(alert);
      setHealingVisible(true);
      setHealingSteps(['正在连接设备...', '检测端口状态...']);
      const res = await alertApi.autoHeal(alert.id);
      setHealingSteps(res.data.steps || ['自愈完成']);
      setTimeout(() => { setHealingVisible(false); fetchAlerts(); }, 2000);
      message.success('自愈成功');
    } catch { message.error('自愈失败'); }
  };

  const handleResolve = (alert: Alert) => {
    let notes = '';
    Modal.confirm({
      title: '确认处置',
      content: <Input.TextArea placeholder="输入处置说明（可选）" onChange={(e) => { notes = e.target.value; }} rows={3} />,
      onOk: async () => {
        try {
          await alertApi.handle(alert.id, { status: 'resolved', handler_notes: notes });
          message.success('已处置');
          fetchAlerts();
        } catch { message.error('处置失败'); }
      },
    });
  };

  const handleAddNotifConfig = async (values: any) => {
    try {
      await alertApi.createNotifConfig(values);
      message.success('通知配置添加成功');
      notifForm.resetFields();
      fetchNotifConfigs();
    } catch { message.error('添加失败'); }
  };

  const handleToggleNotif = async (id: number) => {
    try {
      await alertApi.toggleNotif(id);
      fetchNotifConfigs();
    } catch { message.error('操作失败'); }
  };

  const columns = [
    { title: '告警ID', dataIndex: 'alert_id', key: 'alert_id', width: 130 },
    { title: '设备', dataIndex: 'device_name', key: 'device_name' },
    { title: '级别', dataIndex: 'level', key: 'level', render: (l: string) => <Tag color={levelConfig[l]?.color}>{levelConfig[l]?.label || l}</Tag> },
    { title: '告警内容', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: '类型', dataIndex: 'alert_type', key: 'alert_type', render: (t: string) => ({ system: '系统', network: '网络', config: '配置' })[t] || t },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Badge status={statusConfig[s]?.color as any} text={statusConfig[s]?.label || s} /> },
    { title: '发生次数', dataIndex: 'occurrence_count', key: 'occurrence_count', width: 80 },
    { title: '首次发生', dataIndex: 'first_occurred', key: 'first_occurred', width: 170, render: (v: string) => v?.replace('T', ' ')?.slice(0, 16) },
    {
      title: '操作', key: 'action', width: 280,
      render: (_: any, record: Alert) => (
        <Space>
          <Button size="small" onClick={() => { setCurrentAlert(record); setDetailVisible(true); }}>详情</Button>
          {record.status !== 'resolved' && record.status !== 'closed' && (
            <>
              <Button size="small" onClick={() => handleRootCause(record)}>根因分析</Button>
              {record.is_auto_recovery && <Button size="small" type="primary" onClick={() => handleAutoHeal(record)}>自动自愈</Button>}
              <Button size="small" type="primary" ghost onClick={() => handleResolve(record)}>处置</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  // 降噪后视图：按设备分组的简化列表
  const reducedData = noiseData?.groups || [];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="告警总数" value={alerts.length} suffix="条" valueStyle={{ color: '#1677ff' }} /></Card></Col>
        <Col span={6}>
          <Card>
            <Statistic title="原始告警" value={noiseData?.original_count || 0} suffix="条" />
            {noiseData && <div><Badge color="green" text={`降噪率 ${noiseData.reduction_rate}%`} /></div>}
          </Card>
        </Col>
        <Col span={6}><Card><Statistic title="降噪后" value={noiseData?.reduced_count || 0} suffix="条" valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="待处置" value={alerts.filter(a => a.status === 'open').length} suffix="条" valueStyle={{ color: '#f5222d' }} /></Card></Col>
      </Row>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col><Select placeholder="告警级别" allowClear style={{ width: 130 }} onChange={(v) => setFilters(p => ({ ...p, level: v || '' }))}
            options={Object.entries(levelConfig).map(([k, v]) => ({ value: k, label: v.label }))} /></Col>
          <Col><Select placeholder="处置状态" allowClear style={{ width: 130 }} onChange={(v) => setFilters(p => ({ ...p, status: v || '' }))}
            options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))} /></Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Space>
                <span style={{ fontSize: 13, color: '#666' }}>降噪视图:</span>
                <Switch checkedChildren="降噪后" unCheckedChildren="原始" checked={showReduced} onChange={setShowReduced} />
              </Space>
              <Button onClick={() => setNotifDrawerOpen(true)}>通知设置</Button>
              <Button onClick={fetchAlerts}>刷新</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      {showReduced ? (
        <Card title="降噪后告警（按设备聚合）">
          {reducedData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无降噪数据</div>
          ) : (
            <Table rowKey="device" dataSource={reducedData} pagination={false}
              columns={[
                { title: '设备', dataIndex: 'device', key: 'device' },
                { title: '关联告警数', dataIndex: 'alert_count', key: 'alert_count' },
                { title: '根告警', dataIndex: 'root_alert', key: 'root_alert', ellipsis: true },
                { title: '是否压缩', dataIndex: 'compressed', key: 'compressed', render: (v: boolean) => v ? <Tag color="green">已压缩</Tag> : <Tag>独立</Tag> },
              ]}
            />
          )}
        </Card>
      ) : (
        <Table rowKey="id" columns={columns} dataSource={alerts} loading={loading} pagination={{ pageSize: 15 }} scroll={{ x: 1000 }} />
      )}
      <Modal title="告警详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={600}>
        {currentAlert && (
          <div>
            <p><strong>告警ID：</strong>{currentAlert.alert_id}</p>
            <p><strong>设备：</strong>{currentAlert.device_name} ({currentAlert.device_ip})</p>
            <p><strong>级别：</strong><Tag color={levelConfig[currentAlert.level]?.color}>{levelConfig[currentAlert.level]?.label}</Tag></p>
            <p><strong>内容：</strong>{currentAlert.content}</p>
            <p><strong>状态：</strong><Badge status={statusConfig[currentAlert.status]?.color as any} text={statusConfig[currentAlert.status]?.label} /></p>
            {currentAlert.root_cause && <><p><strong>根因：</strong>{currentAlert.root_cause}</p><p><strong>处理建议：</strong>{currentAlert.handling_suggestion}</p></>}
            <p><strong>首次发生：</strong>{currentAlert.first_occurred}</p>
            <p><strong>最近发生：</strong>{currentAlert.last_occurred}</p>
          </div>
        )}
      </Modal>
      <Modal title="自动自愈进度" open={healingVisible} footer={null} closable={false}>
        <Steps direction="vertical" current={healingSteps.length - 1}
          items={healingSteps.map(s => ({ title: s, status: 'finish' as const }))}
        />
      </Modal>
      <Drawer title="告警通知配置" open={notifDrawerOpen} onClose={() => setNotifDrawerOpen(false)} width={420}>
        <Divider>当前配置</Divider>
        {notifConfigs.map(cfg => (
          <Card key={cfg.id} size="small" style={{ marginBottom: 8 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Tag color="blue">{cfg.method === 'email' ? '邮件' : cfg.method === 'wecom' ? '企业微信' : '短信'}</Tag>
                <span>{cfg.name}</span>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>最低级别: {cfg.min_level}</div>
              </Col>
              <Col>
                <Switch checked={cfg.enable} onChange={() => handleToggleNotif(cfg.id)} />
              </Col>
            </Row>
          </Card>
        ))}
        <Divider>新增配置</Divider>
        <Form form={notifForm} layout="vertical" onFinish={handleAddNotifConfig}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="method" label="通知方式" rules={[{ required: true }]}>
            <Select options={[{ value: 'email', label: '邮件' }, { value: 'wecom', label: '企业微信' }, { value: 'sms', label: '短信' }]} />
          </Form.Item>
          <Form.Item name="webhook_url" label="Webhook地址"><Input /></Form.Item>
          <Form.Item name="recipients" label="接收人"><Input placeholder="多个用逗号分隔" /></Form.Item>
          <Form.Item name="min_level" label="最低通知级别"><Select defaultValue="warning" options={[{ value: 'critical', label: '紧急' }, { value: 'major', label: '重要' }, { value: 'warning', label: '一般' }]} /></Form.Item>
          <Button type="primary" htmlType="submit" block>添加配置</Button>
        </Form>
      </Drawer>
    </div>
  );
}
