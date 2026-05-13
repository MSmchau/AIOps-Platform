import { useState, useEffect } from 'react'
import { Table, Card, Button, Space, Modal, Form, Input, Select, message, Tag, Popconfirm, Row, Col, Statistic } from 'antd'
import { PlusOutlined, PlayCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import { inspectionApi } from '../services/api'
import type { InspectionTask, InspectionResult } from '../types'
import ReactEChartsCore from 'echarts-for-react'

export default function Inspection() {
  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [results, setResults] = useState<InspectionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [taskForm] = Form.useForm();

  const fetchTasks = async () => {
    setLoading(true);
    try { const res = await inspectionApi.tasks(); setTasks(res.data); } catch { message.error('获取巡检任务失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchTasks(); }, []);

  const handleCreateTask = async (values: any) => {
    try {
      await inspectionApi.createTask(values);
      message.success('任务创建成功');
      setTaskModalOpen(false);
      taskForm.resetFields();
      fetchTasks();
    } catch { message.error('创建失败'); }
  };

  const handleDeleteTask = async (id: number) => {
    try { await inspectionApi.deleteTask(id); message.success('已删除'); fetchTasks(); } catch { message.error('删除失败'); }
  };

  const handleRunTask = async (task: InspectionTask) => {
    message.loading({ content: `正在执行 ${task.name}...`, key: 'run' });
    try {
      const res = await inspectionApi.runTask(task.id);
      setResults(res.data);
      setResultVisible(true);
      message.success({ content: '巡检完成', key: 'run' });
    } catch { message.error({ content: '巡检失败', key: 'run' }); }
  };

  const handleGenerateReport = () => {
    const abnormal = results.filter(r => r.status === 'abnormal');
    const normal = results.filter(r => r.status === 'normal');
    const report = `巡检报告\n${'='.repeat(30)}\n生成时间: ${new Date().toLocaleString()}\n总检查项: ${results.length}\n合格: ${normal.length}\n异常: ${abnormal.length}\n合格率: ${results.length ? ((normal.length / results.length) * 100).toFixed(1) : 0}%\n\n异常详情:\n${abnormal.map(r => `  - ${r.device_name} | ${r.indicator} | ${r.value}/${r.threshold}`).join('\n')}\n`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `巡检报告_${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);
    message.success('巡检报告已下载');
  };

  const taskColumns = [
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    { title: 'Cron表达式', dataIndex: 'cron_expr', key: 'cron_expr' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => {
      const m: Record<string, { color: string; text: string }> = { idle: { color: 'default', text: '空闲' }, running: { color: 'processing', text: '运行中' }, completed: { color: 'success', text: '已完成' } };
      return <Tag color={m[s]?.color}>{m[s]?.text || s}</Tag>;
    }},
    { title: '上次执行', dataIndex: 'last_run_at', key: 'last_run_at', render: (v: string) => v?.replace('T', ' ')?.slice(0, 16) || '-' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: InspectionTask) => (
        <Space>
          <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleRunTask(record)}>立即执行</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDeleteTask(record.id)}><Button size="small" danger>删除</Button></Popconfirm>
        </Space>
      ),
    },
  ];

  const resultColumns = [
    { title: '设备', dataIndex: 'device_name', key: 'device_name' },
    { title: '指标', dataIndex: 'indicator', key: 'indicator' },
    { title: '当前值', dataIndex: 'value', key: 'value' },
    { title: '阈值', dataIndex: 'threshold', key: 'threshold' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'normal' ? 'green' : 'red'}>{s === 'normal' ? '正常' : '异常'}</Tag> },
    { title: '详情', dataIndex: 'detail', key: 'detail', ellipsis: true },
    { title: '检查时间', dataIndex: 'inspected_at', key: 'inspected_at', render: (v: string) => v?.replace('T', ' ')?.slice(0, 16) },
  ];

  const abnormalCount = results.filter(r => r.status === 'abnormal').length;
  const totalCount = results.length;
  const passRate = totalCount ? ((totalCount - abnormalCount) / totalCount * 100).toFixed(1) : '0';

  // 异常分布图
  const distOption = {
    title: { text: '异常项分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: [
        { name: '正常', value: totalCount - abnormalCount, itemStyle: { color: '#52c41a' } },
        { name: '异常', value: abnormalCount, itemStyle: { color: '#f5222d' } },
      ],
    }],
  };

  // 指标分布
  const indicatorMap: Record<string, number> = {};
  results.forEach(r => { indicatorMap[r.indicator] = (indicatorMap[r.indicator] || 0) + 1; });
  const indOption = {
    title: { text: '指标检查分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: Object.keys(indicatorMap) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: Object.values(indicatorMap), itemStyle: { color: '#1677ff' } }],
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="巡检任务" value={tasks.length} suffix="个" /></Card></Col>
        <Col span={6}><Card><Statistic title="异常项" value={abnormalCount} suffix="项" valueStyle={{ color: abnormalCount > 0 ? '#f5222d' : '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="合格率" value={passRate} suffix="%" prefix={<Tag color={Number(passRate) > 90 ? 'green' : 'red'}>{Number(passRate) > 90 ? '优' : '差'}</Tag>} /></Card></Col>
        <Col span={6}><Card><Statistic title="检查项" value={totalCount} suffix="项" /></Card></Col>
      </Row>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setTaskModalOpen(true)}>新建巡检任务</Button>
        </Space>
      </Card>
      <Table rowKey="id" columns={taskColumns} dataSource={tasks} loading={loading} pagination={false} />
      <Modal title="巡检结果" open={resultVisible} onCancel={() => setResultVisible(false)} footer={null} width={1000}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={12}><Card size="small"><ReactEChartsCore option={distOption} style={{ height: 220 }} /></Card></Col>
          <Col span={12}><Card size="small"><ReactEChartsCore option={indOption} style={{ height: 220 }} /></Card></Col>
        </Row>
        <div style={{ textAlign: 'right', marginBottom: 8 }}>
          <Button icon={<FileTextOutlined />} onClick={handleGenerateReport}>生成巡检报告</Button>
        </div>
        <Table rowKey="id" columns={resultColumns} dataSource={results} pagination={false} size="small" />
      </Modal>
      <Modal title="新建巡检任务" open={taskModalOpen} onOk={() => taskForm.submit()} onCancel={() => { setTaskModalOpen(false); taskForm.resetFields(); }}>
        <Form form={taskForm} layout="vertical" onFinish={handleCreateTask}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="cron_expr" label="Cron表达式"><Input placeholder="0 2 * * * (每天凌晨2点)" /></Form.Item>
          <Form.Item name="indicators" label="巡检指标"><Select mode="multiple" placeholder="选择巡检指标" options={[{ value: 'cpu', label: 'CPU使用率' }, { value: 'memory', label: '内存使用率' }, { value: 'interface', label: '端口状态' }, { value: 'temperature', label: '温度' }]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
