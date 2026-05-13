import React, { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Space, Typography, theme } from 'antd'
import {
  DashboardOutlined, DesktopOutlined, BellOutlined, SettingOutlined,
  FileSearchOutlined, AuditOutlined, MessageOutlined, ToolOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, UserOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import type { User } from '../types'

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface Props {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '控制台大屏' },
  { key: '/devices', icon: <DesktopOutlined />, label: '设备管理' },
  { key: '/alerts', icon: <BellOutlined />, label: '告警处置' },
  { key: '/configs', icon: <AuditOutlined />, label: '配置管理' },
  { key: '/inspections', icon: <FileSearchOutlined />, label: '智能巡检' },
  { key: '/logs', icon: <ToolOutlined />, label: '日志分析' },
  { key: '/chat', icon: <MessageOutlined />, label: '智能交互' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

export default function AppLayout({ children, user, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('YYYY-MM-DD HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: user?.display_name || user?.username },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') onLogout();
    },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: collapsed ? 14 : 18, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {collapsed ? 'AI' : 'AIOps智能运维'}
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: 18, cursor: 'pointer' },
            })}
            <Text type="secondary" style={{ marginLeft: 16 }}>
              {menuItems.find(m => m.key === location.pathname)?.label || 'AIOps智能运维平台'}
            </Text>
          </Space>
          <Space size="large">
            <Text style={{ fontFamily: 'monospace', fontSize: 14, color: '#666' }}>{currentTime}</Text>
            <Dropdown menu={userMenu}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <Text>{user?.display_name || user?.username}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
