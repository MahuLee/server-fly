import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { MetricData } from '../types';
import './MonitoringPanel.css';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MonitoringPanelProps {
  nodeId: string | null;
  nodeName?: string;
}

/**
 * MonitoringPanel 组件
 * 显示节点的实时监控数据和历史图表
 */
export const MonitoringPanel: React.FC<MonitoringPanelProps> = ({
  nodeId,
  nodeName
}) => {
  const [latestMetrics, setLatestMetrics] = useState<MetricData[]>([]);
  const [historicalData, setHistoricalData] = useState<Map<string, MetricData[]>>(new Map());
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // 秒

  // 获取最新指标数据
  const fetchLatestMetrics = async () => {
    if (!nodeId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/nodes/${nodeId}/metrics/latest`);
      const data = await response.json();

      if (data.success) {
        const metrics = data.data.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setLatestMetrics(metrics);

        // 如果还没有选择指标，自动选择第一个
        if (!selectedMetric && metrics.length > 0) {
          setSelectedMetric(metrics[0].name);
        }
      } else {
        setError(data.error || '获取指标数据失败');
      }
    } catch (err: any) {
      setError(`获取指标数据失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取历史数据
  const fetchHistoricalData = async (metricName: string) => {
    if (!nodeId) return;

    try {
      const response = await fetch(
        `/api/nodes/${nodeId}/metrics/history?metricName=${metricName}&limit=50`
      );
      const data = await response.json();

      if (data.success) {
        const metrics = data.data.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));

        setHistoricalData(prev => {
          const newMap = new Map(prev);
          newMap.set(metricName, metrics);
          return newMap;
        });
      }
    } catch (err: any) {
      console.error('获取历史数据失败:', err);
    }
  };

  // 刷新数据
  const refreshData = () => {
    fetchLatestMetrics();
    if (selectedMetric) {
      fetchHistoricalData(selectedMetric);
    }
  };

  // 初始加载
  useEffect(() => {
    if (nodeId) {
      fetchLatestMetrics();
    }
  }, [nodeId]);

  // 当选择的指标改变时，加载历史数据
  useEffect(() => {
    if (selectedMetric && nodeId) {
      fetchHistoricalData(selectedMetric);
    }
  }, [selectedMetric, nodeId]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || !nodeId) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, nodeId, selectedMetric]);

  // 准备图表数据
  const getChartData = () => {
    if (!selectedMetric) return null;

    const data = historicalData.get(selectedMetric);
    if (!data || data.length === 0) return null;

    // 按时间排序（从旧到新）
    const sortedData = [...data].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    return {
      labels: sortedData.map(m =>
        m.timestamp.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      ),
      datasets: [
        {
          label: selectedMetric,
          data: sortedData.map(m => m.value),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }
      ]
    };
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const
      },
      title: {
        display: true,
        text: selectedMetric ? `${selectedMetric} 历史趋势` : '指标历史趋势'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // 获取阈值违规的样式类
  const getViolationClass = (violation?: 'warning' | 'critical') => {
    if (!violation) return '';
    return violation === 'critical' ? 'metric-critical' : 'metric-warning';
  };

  if (!nodeId) {
    return (
      <div className="monitoring-panel">
        <div className="monitoring-empty">
          <p>请选择一个节点以查看监控数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="monitoring-panel">
      <div className="monitoring-header">
        <h3>监控数据 {nodeName && `- ${nodeName}`}</h3>
        <div className="monitoring-controls">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            自动刷新
          </label>
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={e => setRefreshInterval(Number(e.target.value))}
              className="refresh-interval-select"
            >
              <option value={10}>10秒</option>
              <option value={30}>30秒</option>
              <option value={60}>1分钟</option>
              <option value={300}>5分钟</option>
            </select>
          )}
          <button onClick={refreshData} className="refresh-btn" disabled={loading}>
            {loading ? '刷新中...' : '立即刷新'}
          </button>
        </div>
      </div>

      {error && (
        <div className="monitoring-error">
          <p>{error}</p>
        </div>
      )}

      <div className="monitoring-content">
        {/* 实时指标显示 */}
        <div className="metrics-current">
          <h4>当前指标</h4>
          {latestMetrics.length === 0 ? (
            <p className="no-data">暂无监控数据</p>
          ) : (
            <div className="metrics-grid">
              {latestMetrics.map(metric => (
                <div
                  key={metric.name}
                  className={`metric-card ${getViolationClass(metric.thresholdViolation)} ${
                    selectedMetric === metric.name ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedMetric(metric.name)}
                >
                  <div className="metric-name">{metric.name}</div>
                  <div className="metric-value">
                    {metric.value.toFixed(2)} {metric.unit}
                  </div>
                  {metric.thresholdViolation && (
                    <div className="metric-violation">
                      {metric.thresholdViolation === 'critical' ? '严重' : '警告'}
                    </div>
                  )}
                  <div className="metric-time">
                    {metric.timestamp.toLocaleTimeString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 历史数据图表 */}
        {selectedMetric && (
          <div className="metrics-chart">
            <h4>历史趋势</h4>
            <div className="chart-container">
              {getChartData() ? (
                <Line data={getChartData()!} options={chartOptions} />
              ) : (
                <p className="no-data">加载历史数据中...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringPanel;
