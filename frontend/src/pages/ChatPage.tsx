import { useState, useEffect, useRef } from 'react'
import { Input, Button, Card, List, Avatar, Space, Typography, message, Spin, Tag, Popconfirm } from 'antd'
import { SendOutlined, RobotOutlined, UserOutlined, DeleteOutlined, MessageOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { chatApi, deviceApi, configApi } from '../services/api'
import type { ChatMessage, ChatSession } from '../types'

const { TextArea } = Input;
const { Text, Title } = Typography;

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string>('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actions, setActions] = useState<Array<{ type: string; label: string; command: string }> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await chatApi.sessions();
      setSessions(res.data);
      if (res.data.length > 0 && !currentSession) {
        setCurrentSession(res.data[0].session_id);
      }
    } catch { /* ignore */ }
  };

  const fetchHistory = async (sessionId: string) => {
    setLoadingHistory(true);
    try {
      const res = await chatApi.history(sessionId);
      setMessages(res.data);
    } catch { message.error('获取历史记录失败'); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => {
    if (currentSession) fetchHistory(currentSession);
    else { setMessages([]); setActions(null); }
  }, [currentSession]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    setActions(null);
    try {
      const res = await chatApi.send({ message: input, session_id: currentSession || undefined });
      setInput('');
      if (!currentSession) {
        setCurrentSession(res.data.session_id);
        fetchSessions();
      }
      fetchHistory(res.data.session_id);
      if (res.data.actions) setActions(res.data.actions);
    } catch { message.error('发送失败'); }
    finally { setSending(false); }
  };

  const handleNewChat = () => {
    setCurrentSession('');
    setMessages([]);
    setInput('');
    setActions(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await chatApi.deleteSession(sessionId);
      message.success('已删除');
      fetchSessions();
      if (currentSession === sessionId) {
        setCurrentSession('');
        setMessages([]);
        setActions(null);
      }
    } catch { message.error('删除失败'); }
  };

  const handleAction = async (action: { type: string; label: string; command: string }) => {
    message.loading({ content: `正在执行: ${action.label}...`, key: 'action' });
    try {
      if (action.type === 'backup') {
        await configApi.runBackup([]);
      } else if (action.type === 'reboot') {
        await deviceApi.reboot(1);
      }
      message.success({ content: `${action.label} 执行成功`, key: 'action' });
      // 添加系统消息
      const sysMsg = `✅ 已执行操作: ${action.label}`;
      setMessages(prev => [...prev, {
        id: Date.now(), session_id: currentSession, role: 'assistant',
        content: sysMsg, message_type: 'result', created_at: new Date().toISOString(),
      }]);
    } catch { message.error({ content: '执行失败', key: 'action' }); }
  };

  // 查找最后一条AI回复中是否包含动作
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 160px)' }}>
      {/* 左侧会话列表 */}
      <Card style={{ width: 280, marginRight: 16, flexShrink: 0, overflow: 'auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Button type="primary" block onClick={handleNewChat}>+ 新对话</Button>
          <List size="small"
            dataSource={sessions}
            renderItem={(item) => (
              <List.Item
                onClick={() => setCurrentSession(item.session_id)}
                style={{ cursor: 'pointer', background: currentSession === item.session_id ? '#e6f4ff' : 'transparent', padding: '8px 12px', borderRadius: 6 }}
                actions={[
                  <Popconfirm title="确认删除？" onConfirm={() => handleDeleteSession(item.session_id)}>
                    <DeleteOutlined style={{ color: '#999' }} />
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<MessageOutlined />} size="small" />}
                  title={<Text ellipsis style={{ maxWidth: 140 }}>{item.session_id.slice(0, 8)}</Text>}
                  description={<Text type="secondary" style={{ fontSize: 12 }}>{item.message_count}条消息</Text>}
                />
              </List.Item>
            )}
          />
        </Space>
      </Card>
      {/* 右侧对话区 */}
      <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
          {loadingHistory ? (
            <Spin style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 100, color: '#999' }}>
              <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <Title level={5} type="secondary">你好！我是AIOps智能运维助手</Title>
              <Text type="secondary">请描述您遇到的运维问题，我将为您提供排查指导</Text>
              <div style={{ marginTop: 24 }}>
                <Space wrap>
                  <Tag style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => { setInput('核心交换机端口down怎么排查'); }}>🔍 端口down排查</Tag>
                  <Tag style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => { setInput('如何配置BGP邻居'); }}>🌐 BGP配置</Tag>
                  <Tag style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => { setInput('备份所有华为交换机配置'); }}>💾 备份配置</Tag>
                  <Tag style={{ cursor: 'pointer', padding: '4px 12px' }} onClick={() => { setInput('检查全网设备状态'); }}>📊 全网检查</Tag>
                </Space>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', marginBottom: 16, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%' }}>
                    <Space align="start">
                      {msg.role === 'assistant' && <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1677ff' }} />}
                      <div style={{
                        padding: '10px 16px', borderRadius: 8,
                        background: msg.role === 'user' ? '#1677ff' : '#f0f0f0',
                        color: msg.role === 'user' ? '#fff' : '#000',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {msg.content}
                      </div>
                      {msg.role === 'user' && <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} />}
                    </Space>
                  </div>
                </div>
              ))}
              {/* 操作指令按钮 */}
              {actions && actions.length > 0 && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Space>
                    {actions.map((action, idx) => (
                      <Button key={idx} icon={<ThunderboltOutlined />} type="primary" ghost
                        onClick={() => handleAction(action)}>
                        {action.label}
                      </Button>
                    ))}
                  </Space>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="输入运维问题，如：核心交换机端口down怎么排查"
              rows={2}
              disabled={sending}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={sending} style={{ height: 54 }}>
              发送
            </Button>
          </Space.Compact>
        </div>
      </Card>
    </div>
  );
}
