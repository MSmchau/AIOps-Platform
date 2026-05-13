import { useState, useEffect } from 'react'
import { Tabs, Table, Card, Button, Space, Modal, Form, Input, Select, message, Tag, Popconfirm, Switch } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { systemApi } from '../services/api'
import type { User, Role, OperationLog } from '../types'

export default function SystemSettings() {
  // 用户管理
  const [users, setUsers] = useState<User[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm] = Form.useForm();
  const [editUserId, setEditUserId] = useState<number | null>(null);

  // 角色管理
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm] = Form.useForm();

  // 操作日志
  const [logs, setLogs] = useState<OperationLog[]>([]);

  const fetchUsers = async () => {
    try { const res = await systemApi.users(); setUsers(res.data); } catch { message.error('获取用户列表失败'); }
  };
  const fetchRoles = async () => {
    try { const res = await systemApi.roles(); setRoles(res.data); } catch { message.error('获取角色列表失败'); }
  };
  const fetchLogs = async () => {
    try { const res = await systemApi.logs(); setLogs(res.data); } catch { /* ignore */ }
  };

  useEffect(() => { fetchUsers(); fetchRoles(); fetchLogs(); }, []);

  const handleCreateUser = async (values: any) => {
    try {
      if (editUserId) {
        await systemApi.updateUser(editUserId, values);
        message.success('用户更新成功');
      } else {
        await systemApi.createUser(values);
        message.success('用户创建成功');
      }
      setUserModalOpen(false);
      userForm.resetFields();
      setEditUserId(null);
      fetchUsers();
    } catch (err: any) { message.error(err.response?.data?.detail || '操作失败'); }
  };

  const handleDeleteUser = async (id: number) => {
    try { await systemApi.deleteUser(id); message.success('已删除'); fetchUsers(); } catch { message.error('删除失败'); }
  };

  const handleCreateRole = async (values: any) => {
    try {
      await systemApi.createRole(values);
      message.success('角色创建成功');
      setRoleModalOpen(false);
      roleForm.resetFields();
      fetchRoles();
    } catch { message.error('创建失败'); }
  };

  const handleDeleteRole = async (id: number) => {
    try { await systemApi.deleteRole(id); message.success('已删除'); fetchRoles(); } catch { message.error('删除失败'); }
  };

  const userColumns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '角色', dataIndex: 'role_name', key: 'role_name', render: (v: string) => <Tag>{v || '-'}</Tag> },
    { title: '状态', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '禁用'}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.replace('T', ' ')?.slice(0, 16) },
    {
      title: '操作', key: 'action',
      render: (_: any, record: User) => (
        <Space>
          <Button size="small" onClick={() => {
            setEditUserId(record.id);
            userForm.setFieldsValue(record);
            setUserModalOpen(true);
          }}>编辑</Button>
          {record.username !== 'admin' && (
            <Popconfirm title="确认删除此用户？" onConfirm={() => handleDeleteUser(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const roleColumns = [
    { title: '角色名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '权限', dataIndex: 'permissions', key: 'permissions', ellipsis: true },
    {
      title: '操作', key: 'action',
      render: (_: any, record: Role) => record.name !== 'admin' ? (
        <Popconfirm title="确认删除此角色？" onConfirm={() => handleDeleteRole(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ) : null,
    },
  ];

  const logColumns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.replace('T', ' ')?.slice(0, 19) },
    { title: '用户', dataIndex: 'username', key: 'username' },
    { title: '操作', dataIndex: 'action', key: 'action' },
    { title: '对象', dataIndex: 'target', key: 'target' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'success' ? 'green' : 'red'}>{s}</Tag> },
    { title: '详情', dataIndex: 'detail', key: 'detail', ellipsis: true },
  ];

  const tabItems = [
    {
      key: 'users', label: '用户管理',
      children: (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditUserId(null); userForm.resetFields(); setUserModalOpen(true); }}>新增用户</Button>
          </Card>
          <Table rowKey="id" columns={userColumns} dataSource={users} pagination={false} />
        </div>
      ),
    },
    {
      key: 'roles', label: '角色权限',
      children: (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setRoleModalOpen(true)}>新增角色</Button>
          </Card>
          <Table rowKey="id" columns={roleColumns} dataSource={roles} pagination={false} />
        </div>
      ),
    },
    {
      key: 'config', label: '采集配置',
      children: (
        <Card>
          <Form layout="vertical" style={{ maxWidth: 500 }}>
            <Form.Item label="Telemetry采集周期（秒）"><Input defaultValue={30} type="number" /></Form.Item>
            <Form.Item label="SNMP采集周期（秒）"><Input defaultValue={300} type="number" /></Form.Item>
            <Form.Item label="日志采集范围"><Select mode="multiple" defaultValue={['system', 'device']} options={[{ value: 'system', label: '系统日志' }, { value: 'device', label: '设备日志' }, { value: 'business', label: '业务日志' }]} /></Form.Item>
            <Button type="primary">保存配置</Button>
          </Form>
        </Card>
      ),
    },
    {
      key: 'deploy', label: '部署配置',
      children: (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div><Tag color="green">运行中</Tag> AIOps-Backend (FastAPI) - 端口 8000</div>
            <div><Tag color="green">运行中</Tag> AIOps-Frontend (Nginx) - 端口 3000</div>
            <div><Tag color="green">运行中</Tag> MySQL 8.0 - 端口 3306</div>
            <div><Tag color="default">已停止</Tag> Redis - 端口 6379</div>
            <Space style={{ marginTop: 16 }}>
              <Button>重启所有容器</Button>
              <Button>查看日志</Button>
            </Space>
          </Space>
        </Card>
      ),
    },
    {
      key: 'syslog', label: '系统日志',
      children: (
        <Table rowKey="id" columns={logColumns} dataSource={logs} pagination={{ pageSize: 15 }} />
      ),
    },
  ];

  return (
    <div>
      <Tabs items={tabItems} />
      <Modal title={editUserId ? '编辑用户' : '新增用户'} open={userModalOpen} onOk={() => userForm.submit()} onCancel={() => { setUserModalOpen(false); userForm.resetFields(); setEditUserId(null); }}>
        <Form form={userForm} layout="vertical" onFinish={handleCreateUser}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, min: 3 }]}><Input disabled={!!editUserId} /></Form.Item>
          {!editUserId && <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>}
          <Form.Item name="display_name" label="显示名称"><Input /></Form.Item>
          <Form.Item name="email" label="邮箱"><Input type="email" /></Form.Item>
          <Form.Item name="phone" label="手机号"><Input /></Form.Item>
          <Form.Item name="role_id" label="角色"><Select allowClear options={roles.map(r => ({ value: r.id, label: r.name }))} /></Form.Item>
        </Form>
      </Modal>
      <Modal title="新增角色" open={roleModalOpen} onOk={() => roleForm.submit()} onCancel={() => { setRoleModalOpen(false); roleForm.resetFields(); }}>
        <Form form={roleForm} layout="vertical" onFinish={handleCreateRole}>
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input /></Form.Item>
          <Form.Item name="permissions" label="权限配置"><Input.TextArea rows={4} placeholder='{"pages":["dashboard","devices"],"actions":["read","write"]}' /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
