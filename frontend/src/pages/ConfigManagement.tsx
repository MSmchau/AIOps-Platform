import { useState, useEffect } from 'react'
import { Tabs, Table, Card, Button, Space, Modal, Form, Input, message, Tag, Select, Popconfirm, Divider, Tooltip } from 'antd'
import { DownloadOutlined, RollbackOutlined, HistoryOutlined, DiffOutlined } from '@ant-design/icons'
import { configApi } from '../services/api'
import type { ConfigBackup, ConfigBaseline } from '../types'
import dayjs from 'dayjs'

// 模拟版本历史数据
const mockVersions = [
  { id: 1, device: 'SW-Core-01', version: 'V20240513-001', time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), author: 'admin', comment: '日常备份' },
  { id: 2, device: 'SW-Core-01', version: 'V20240512-001', time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), author: 'admin', comment: '配置变更前备份' },
  { id: 3, device: 'SW-Agg-01', version: 'V20240511-001', time: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), author: 'admin', comment: 'VLAN配置调整' },
  { id: 4, device: 'SW-Core-01', version: 'V20240510-001', time: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'), author: 'admin', comment: '初始配置备份' },
];

export default function ConfigManagement() {
  const [backups, setBackups] = useState<ConfigBackup[]>([]);
  const [bkLoading, setBkLoading] = useState(false);
  const [baselines, setBaselines] = useState<ConfigBaseline[]>([]);
  const [blModalOpen, setBlModalOpen] = useState(false);
  const [blForm] = Form.useForm();
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployForm] = Form.useForm();
  const [versionDiff, setVersionDiff] = useState<string | null>(null);

  const fetchBackups = async () => {
    setBkLoading(true);
    try { const res = await configApi.backups(); setBackups(res.data); } catch { message.error('获取备份列表失败'); }
    finally { setBkLoading(false); }
  };
  const fetchBaselines = async () => {
    try { const res = await configApi.baselines(); setBaselines(res.data); } catch { message.error('获取基线列表失败'); }
  };
  useEffect(() => { fetchBackups(); fetchBaselines(); }, []);

  const handleRunBackup = async () => {
    message.loading({ content: '正在备份...', key: 'backup' });
    try {
      await configApi.runBackup([]);
      message.success({ content: '备份完成', key: 'backup' });
      fetchBackups();
    } catch { message.error({ content: '备份失败', key: 'backup' }); }
  };

  const handleCreateBaseline = async (values: any) => {
    try {
      await configApi.createBaseline(values);
      message.success('基线创建成功');
      setBlModalOpen(false);
      blForm.resetFields();
      fetchBaselines();
    } catch { message.error('创建失败'); }
  };

  const handleDeleteBaseline = async (id: number) => {
    try { await configApi.deleteBaseline(id); message.success('已删除'); fetchBaselines(); } catch { message.error('删除失败'); }
  };

  const handleDeploy = async (values: any) => {
    try {
      await configApi.deploy(values);
      message.success('配置下发成功');
      setDeployModalOpen(false);
      deployForm.resetFields();
    } catch { message.error('下发失败'); }
  };

  const handleDownload = (record: ConfigBackup) => {
    const content = `备份设备: ${record.device_name}\n版本: ${record.version}\n时间: ${record.backup_time}\n---\n模拟配置备份内容...`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${record.device_name}_${record.version}.cfg`;
    a.click(); URL.revokeObjectURL(url);
    message.success('备份文件已下载');
  };

  const handleRollback = (version: any) => {
    Modal.confirm({
      title: `确认回滚到版本 ${version.version}？`,
      content: `设备: ${version.device}\n时间: ${version.time}\n该操作将覆盖当前配置，请确认。`,
      onOk: () => { message.success(`已开始回滚至版本 ${version.version}`); },
    });
  };

  const handleShowDiff = (version: any) => {
    setVersionDiff(`--- 当前配置\n+++ ${version.version} (${version.time})\n@@ -1,3 +1,4 @@\n sysname ${version.device}\n+配置版本: ${version.version}\n interface GigabitEthernet0/0/0\n- ip address 192.168.1.1 255.255.255.0\n+ ip address 192.168.1.2 255.255.255.0`);
  };

  const backupColumns = [
    { title: '设备名称', dataIndex: 'device_name', key: 'device_name' },
    { title: '版本', dataIndex: 'version', key: 'version' },
    { title: '备份时间', dataIndex: 'backup_time', key: 'backup_time', render: (v: string) => v?.replace('T', ' ')?.slice(0, 19) },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'success' ? 'green' : 'red'}>{s === 'success' ? '成功' : '失败'}</Tag> },
    { title: '操作', key: 'action', render: (_: any, r: ConfigBackup) => <Tooltip title="下载备份"><Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r)} /></Tooltip> },
  ];

  const baselineColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '适用设备', dataIndex: 'device_type', key: 'device_type', render: (v: string) => ({ switch: '交换机', router: '路由器', firewall: '防火墙' })[v] || v || '全部' },
    { title: '状态', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '禁用'}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.replace('T', ' ')?.slice(0, 16) },
    { title: '操作', key: 'action', render: (_: any, record: ConfigBaseline) => (
      <Space>
        <Button size="small" onClick={() => message.success('基线检查已触发，请查看结果')}>执行检查</Button>
        <Popconfirm title="确认删除？" onConfirm={() => handleDeleteBaseline(record.id)}><Button size="small" danger>删除</Button></Popconfirm>
      </Space>
    )},
  ];

  const versionColumns = [
    { title: '设备', dataIndex: 'device', key: 'device' },
    { title: '版本号', dataIndex: 'version', key: 'version' },
    { title: '时间', dataIndex: 'time', key: 'time' },
    { title: '操作人', dataIndex: 'author', key: 'author' },
    { title: '备注', dataIndex: 'comment', key: 'comment' },
    { title: '操作', key: 'action', render: (_: any, record: any) => (
      <Space>
        <Tooltip title="版本对比"><Button size="small" icon={<DiffOutlined />} onClick={() => handleShowDiff(record)} /></Tooltip>
        <Tooltip title="回滚到此版本"><Button size="small" icon={<RollbackOutlined />} onClick={() => handleRollback(record)} /></Tooltip>
      </Space>
    )},
  ];

  const tabItems = [
    {
      key: 'backup', label: '配置备份',
      children: (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" onClick={handleRunBackup}>手动备份</Button>
              <Button>定时备份设置</Button>
            </Space>
          </Card>
          <Table rowKey="id" columns={backupColumns} dataSource={backups} loading={bkLoading} pagination={{ pageSize: 10 }} />
        </div>
      ),
    },
    {
      key: 'baseline', label: '基线检查',
      children: (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" onClick={() => setBlModalOpen(true)}>新增基线</Button>
            </Space>
          </Card>
          <Table rowKey="id" columns={baselineColumns} dataSource={baselines} pagination={false} />
        </div>
      ),
    },
    {
      key: 'version', label: '版本管理',
      children: (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <HistoryOutlined /><span>版本历史（对接Git）</span>
            </Space>
          </Card>
          <Table rowKey="id" columns={versionColumns} dataSource={mockVersions} pagination={false} />
          <Modal title="版本对比" open={!!versionDiff} onCancel={() => setVersionDiff(null)} footer={null} width={700}>
            <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, fontSize: 13, whiteSpace: 'pre-wrap' }}>{versionDiff}</pre>
          </Modal>
        </div>
      ),
    },
    {
      key: 'deploy', label: '配置下发',
      children: (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Button type="primary" onClick={() => setDeployModalOpen(true)}>新建下发任务</Button>
          </Card>
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>配置下发记录将在此处展示</div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Tabs items={tabItems} />
      <Modal title="新增基线" open={blModalOpen} onOk={() => blForm.submit()} onCancel={() => { setBlModalOpen(false); blForm.resetFields(); }}>
        <Form form={blForm} layout="vertical" onFinish={handleCreateBaseline}>
          <Form.Item name="name" label="基线名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="device_type" label="适用设备类型"><Select allowClear options={[{ value: 'switch', label: '交换机' }, { value: 'router', label: '路由器' }, { value: 'firewall', label: '防火墙' }]} /></Form.Item>
          <Form.Item name="content" label="基线配置内容" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
        </Form>
      </Modal>
      <Modal title="配置下发" open={deployModalOpen} onOk={() => deployForm.submit()} onCancel={() => { setDeployModalOpen(false); deployForm.resetFields(); }}>
        <Form form={deployForm} layout="vertical" onFinish={handleDeploy}>
          <Form.Item name="device_ids" label="目标设备" rules={[{ required: true }]}><Select mode="multiple" placeholder="选择设备ID" /></Form.Item>
          <Form.Item name="config_content" label="配置内容" rules={[{ required: true }]}><Input.TextArea rows={6} placeholder="输入配置命令" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
