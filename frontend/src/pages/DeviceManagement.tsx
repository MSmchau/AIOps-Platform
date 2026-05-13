import { useState, useEffect } from 'react'
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, message, Popconfirm, Row, Col, Statistic, Badge, Tooltip, Descriptions, Drawer } from 'antd'
import { PlusOutlined, ReloadOutlined, PoweroffOutlined, CodeOutlined, CopyOutlined, DeleteOutlined, DashboardOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { deviceApi } from '../services/api'
import type { Device, DeviceCreate } from '../types'
import ReactEChartsCore from 'echarts-for-react'

const statusMap: Record<string, { color: string; text: string }> = {
  online: { color: 'green', text: '在线' },
  offline: { color: 'default', text: '离线' },
  fault: { color: 'red', text: '故障' },
};

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({ keyword: '', vendor: '', status: '' });
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // 远程命令执行
  const [cmdModalOpen, setCmdModalOpen] = useState(false);
  const [cmdDevice, setCmdDevice] = useState<Device | null>(null);
  const [cmdInput, setCmdInput] = useState('display version');
  const [cmdResult, setCmdResult] = useState('');

  // 状态监控抽屉
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [monitorDevice, setMonitorDevice] = useState<Device | null>(null);

  // 批量导入
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await deviceApi.list(filters);
      setDevices(res.data);
    } catch { message.error('获取设备列表失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDevices(); }, [filters]);

  const handleCreate = async (values: DeviceCreate) => {
    try {
      await deviceApi.create(values);
      message.success('设备添加成功');
      setModalOpen(false);
      form.resetFields();
      fetchDevices();
    } catch (err: any) { message.error(err.response?.data?.detail || '添加失败'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deviceApi.delete(id);
      message.success('已删除');
      fetchDevices();
    } catch { message.error('删除失败'); }
  };

  const handleCmdExecute = async () => {
    if (!cmdDevice || !cmdInput.trim()) return;
    try {
      const res = await deviceApi.execute(cmdDevice.id, cmdInput);
      setCmdResult(res.data.output);
    } catch { message.error('执行失败'); }
  };

  const handleReboot = async (device: Device) => {
    try {
      await deviceApi.reboot(device.id);
      message.success(`重启指令已下发至 ${device.name}`);
    } catch { message.error('重启失败'); }
  };

  const handleBackup = async (device: Device) => {
    try {
      await deviceApi.backup(device.id);
      message.success(`配置备份完成 - ${device.name}`);
    } catch { message.error('备份失败'); }
  };

  // 批量操作
  const handleBatchBackup = async () => {
    if (selectedRowKeys.length === 0) { message.warning('请先选择设备'); return; }
    try {
      const results = await Promise.all(selectedRowKeys.map(id => deviceApi.backup(id)));
      message.success(`已成功备份 ${results.length} 台设备`);
      fetchDevices();
    } catch { message.error('批量备份失败'); }
  };

  const handleBatchReboot = async () => {
    if (selectedRowKeys.length === 0) { message.warning('请先选择设备'); return; }
    Modal.confirm({
      title: `确认重启选中的 ${selectedRowKeys.length} 台设备？`,
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map(id => deviceApi.reboot(id)));
          message.success(`已向 ${selectedRowKeys.length} 台设备下发重启指令`);
        } catch { message.error('批量重启失败'); }
      },
    });
  };

  const handleMonitor = (device: Device) => {
    setMonitorDevice(device);
    setMonitorOpen(true);
  };

  // 批量导出
  const handleExport = async () => {
    try {
      const res = await deviceApi.exportDevices();
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devices_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('设备列表已导出');
    } catch { message.error('导出失败'); }
  };

  // 批量导入
  const handleImport = async () => {
    if (!importFile) { message.warning('请选择CSV文件'); return; }
    setImporting(true);
    try {
      const res = await deviceApi.importDevices(importFile);
      const data = res.data;
      message.success(`成功导入 ${data.imported} 台设备${data.errors.length > 0 ? `，${data.errors.length} 条错误` : ''}`);
      if (data.errors.length > 0) {
        Modal.warning({
          title: '导入错误详情',
          content: <pre style={{ maxHeight: 300, overflow: 'auto', fontSize: 12 }}>{data.errors.join('\n')}</pre>,
          width: 500,
        });
      }
      setImportModalOpen(false);
      setImportFile(null);
      fetchDevices();
    } catch (err: any) { message.error(err.response?.data?.detail || '导入失败'); }
    finally { setImporting(false); }
  };

  // 构造模拟时序数据
  const metricChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['CPU使用率', '内存使用率'], bottom: 0 },
    xAxis: { type: 'category', data: Array.from({length: 12}, (_, i) => `${i * 5}分钟前`) },
    yAxis: { type: 'value', max: 100 },
    series: [
      {
        name: 'CPU使用率',
        type: 'line',
        smooth: true,
        data: Array.from({length: 12}, () => Math.round(Math.random() * 40 + 20 + (monitorDevice?.cpu_usage || 0) * 0.3)),
        itemStyle: { color: '#1677ff' },
      },
      {
        name: '内存使用率',
        type: 'line',
        smooth: true,
        data: Array.from({length: 12}, () => Math.round(Math.random() * 30 + 40 + (monitorDevice?.memory_usage || 0) * 0.3)),
        itemStyle: { color: '#52c41a' },
      },
    ],
  };

  const columns = [
    { title: '设备名称', dataIndex: 'name', key: 'name', render: (text: string, record: Device) => <a onClick={() => { setCurrentDevice(record); setDetailOpen(true); }}>{text}</a> },
    { title: 'IP地址', dataIndex: 'ip_address', key: 'ip_address' },
    { title: '厂商', dataIndex: 'vendor', key: 'vendor', render: (v: string) => <Tag>{v}</Tag> },
    { title: '型号', dataIndex: 'model', key: 'model' },
    { title: '设备类型', dataIndex: 'device_type', key: 'device_type', render: (v: string) => ({ switch: '交换机', router: '路由器', firewall: '防火墙' })[v] || v },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Badge status={statusMap[s]?.color as any} text={statusMap[s]?.text || s} /> },
    { title: '在线时长', dataIndex: 'online_duration', key: 'online_duration', render: (v: number) => v ? `${Math.floor(v / 60)}小时${v % 60}分` : '-' },
    { title: 'CPU', dataIndex: 'cpu_usage', key: 'cpu_usage', render: (v: number) => <Tag color={v > 80 ? 'red' : v > 60 ? 'orange' : 'green'}>{v}%</Tag> },
    { title: '内存', dataIndex: 'memory_usage', key: 'memory_usage', render: (v: number) => <Tag color={v > 80 ? 'red' : v > 60 ? 'orange' : 'green'}>{v}%</Tag> },
    {
      title: '操作', key: 'action', width: 300,
      render: (_: any, record: Device) => (
        <Space>
          <Tooltip title="执行命令"><Button size="small" icon={<CodeOutlined />} onClick={() => { setCmdDevice(record); setCmdInput('display version'); setCmdResult(''); setCmdModalOpen(true); }} /></Tooltip>
          <Tooltip title="状态监控"><Button size="small" icon={<DashboardOutlined />} onClick={() => handleMonitor(record)} /></Tooltip>
          <Tooltip title="备份配置"><Button size="small" icon={<CopyOutlined />} onClick={() => handleBackup(record)} /></Tooltip>
          <Tooltip title="重启设备"><Popconfirm title="确认重启该设备？" onConfirm={() => handleReboot(record)}><Button size="small" icon={<PoweroffOutlined />} danger /></Popconfirm></Tooltip>
          <Tooltip title="删除"><Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}><Button size="small" icon={<DeleteOutlined />} danger /></Popconfirm></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col><Input.Search placeholder="搜索设备名称/IP" allowClear onSearch={(v) => setFilters(p => ({ ...p, keyword: v }))} style={{ width: 250 }} /></Col>
          <Col><Select placeholder="厂商" allowClear style={{ width: 120 }} onChange={(v) => setFilters(p => ({ ...p, vendor: v || '' }))} options={[{ value: '华为', label: '华为' }, { value: 'H3C', label: 'H3C' }, { value: '思科', label: '思科' }]} /></Col>
          <Col><Select placeholder="状态" allowClear style={{ width: 120 }} onChange={(v) => setFilters(p => ({ ...p, status: v || '' }))} options={[{ value: 'online', label: '在线' }, { value: 'offline', label: '离线' }, { value: 'fault', label: '故障' }]} /></Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchDevices}>刷新</Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
              <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>导入</Button>
              {selectedRowKeys.length > 0 && (
                <>
                  <Badge count={selectedRowKeys.length}><Button onClick={handleBatchBackup}>批量备份</Button></Badge>
                  <Button danger onClick={handleBatchReboot}>批量重启</Button>
                </>
              )}
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>添加设备</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Table rowKey="id" columns={columns} dataSource={devices} loading={loading}
        rowSelection={{ selectedRowKeys, onChange: (keys: any) => setSelectedRowKeys(keys) }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 台设备` }}
        scroll={{ x: 1200 }}
      />
      {/* 添加设备弹窗 */}
      <Modal title="添加设备" open={modalOpen} onOk={() => form.submit()} onCancel={() => { setModalOpen(false); form.resetFields(); }}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="设备名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="ip_address" label="管理IP" rules={[{ required: true }, { pattern: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, message: '请输入有效IP' }]}><Input /></Form.Item>
          <Form.Item name="vendor" label="厂商" rules={[{ required: true }]}><Select options={[{ value: '华为', label: '华为' }, { value: 'H3C', label: 'H3C' }, { value: '思科', label: '思科' }]} /></Form.Item>
          <Form.Item name="device_type" label="设备类型"><Select options={[{ value: 'switch', label: '交换机' }, { value: 'router', label: '路由器' }, { value: 'firewall', label: '防火墙' }]} /></Form.Item>
          <Form.Item name="model" label="型号"><Input /></Form.Item>
          <Form.Item name="location" label="位置"><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
      {/* 设备详情弹窗 */}
      <Modal title={`设备详情 - ${currentDevice?.name}`} open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={600}>
        {currentDevice && (
          <Descriptions column={2} bordered size="small">
            {Object.entries({
              '设备名称': currentDevice.name, 'IP地址': currentDevice.ip_address,
              '厂商': currentDevice.vendor, '型号': currentDevice.model || '-',
              '设备类型': currentDevice.device_type, '状态': statusMap[currentDevice.status]?.text || currentDevice.status,
              'CPU使用率': `${currentDevice.cpu_usage}%`, '内存使用率': `${currentDevice.memory_usage}%`,
              '在线时长': currentDevice.online_duration ? `${Math.floor(currentDevice.online_duration / 60)}小时` : '-',
              '位置': currentDevice.location || '-', '描述': currentDevice.description || '-',
              '创建时间': currentDevice.created_at, '更新时间': currentDevice.updated_at,
            }).map(([label, value]) => (
              <Descriptions.Item label={label}>{value}</Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Modal>
      {/* 远程命令执行弹窗 */}
      <Modal title={`远程执行命令 - ${cmdDevice?.name}`} open={cmdModalOpen}
        onCancel={() => setCmdModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCmdModalOpen(false)}>关闭</Button>,
          <Button key="exec" type="primary" onClick={handleCmdExecute}>执行</Button>,
        ]}
        width={650}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea rows={3} value={cmdInput} onChange={(e) => setCmdInput(e.target.value)} placeholder="输入命令，如：display version" />
          <Button type="primary" onClick={handleCmdExecute}>执行</Button>
          {cmdResult && (
            <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {cmdResult}
            </pre>
          )}
        </Space>
      </Modal>
      {/* 批量导入弹窗 */}
      <Modal title="批量导入设备" open={importModalOpen} onCancel={() => { setImportModalOpen(false); setImportFile(null); }}
        onOk={handleImport} confirmLoading={importing} okText="导入" width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 13 }}>
            <p><strong>CSV格式要求：</strong></p>
            <p>必填列：name, ip_address, vendor</p>
            <p>可选列：model, device_type, status, location, description</p>
            <p style={{ color: '#999', marginTop: 4 }}>示例：name,ip_address,vendor,model,device_type,status</p>
            <p style={{ color: '#999' }}>SW01,192.168.1.1,华为,CE12808,switch,online</p>
          </div>
          <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
          {importFile && <Tag color="blue">{importFile.name}</Tag>}
        </Space>
      </Modal>
      {/* 状态监控抽屉 */}
      <Drawer title={`实时监控 - ${monitorDevice?.name}`} open={monitorOpen} onClose={() => setMonitorOpen(false)} width={480}>
        {monitorDevice && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}><Statistic title="CPU使用率" value={monitorDevice.cpu_usage} suffix="%" valueStyle={{ color: monitorDevice.cpu_usage > 80 ? '#f5222d' : '#52c41a' }} /></Col>
              <Col span={12}><Statistic title="内存使用率" value={monitorDevice.memory_usage} suffix="%" valueStyle={{ color: monitorDevice.memory_usage > 80 ? '#f5222d' : '#52c41a' }} /></Col>
            </Row>
            <Card title="性能趋势" style={{ marginTop: 16 }}>
              <ReactEChartsCore option={metricChartOption} style={{ height: 280 }} />
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
