import React, { useState, useEffect } from 'react';
import { MetricData } from '../types';
import { API_ENDPOINTS } from '../config/api';
import './MetricsDetailDrawer.css';

interface MetricsDetailDrawerProps {
  visible: boolean;
  nodeId: string | null;
  nodeName: string;
  nodeType: string;
  metrics: MetricData[];
  onClose: () => void;
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

export const MetricsDetailDrawer: React.FC<MetricsDetailDrawerProps> = ({
  visible,
  nodeId,
  nodeName,
  nodeType,
  metrics,
  onClose
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1h');
  const [historicalData, setHistoricalData] = useState<Record<string, MetricData[]>>({});
  const [loading, setLoading] = useState(false);

  // 获取历史数据
  useEffect(() => {
    if (!visible || !nodeId) return;

    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        const now = Date.now();
        const timeRanges: Record<TimeRange, number> = {
          '1h': 3600000,
          '6h': 21600000,
          '24h': 86400000,
          '7d': 604800000
        };

        const startTime = new Date(now - timeRanges[selectedTimeRange]);
        const endTime = new Date(now);

        const response = await fetch(
          `${API_ENDPOINTS.nodeMetricsHistory(nodeId)}?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch historical data');
        }

        const result = await response.json();

        // 按指标名称分组
        const grouped: Record<string, MetricData[]> = {};
        if (result.success && result.data) {
          result.data.forEach((metric: MetricData) => {
            if (!grouped[metric.name]) {
              grouped[metric.name] = [];
            }
            grouped[metric.name].push({
              ...metric,
              timestamp: new Date(metric.timestamp)
            });
          });
        }

        setHistoricalData(grouped);
      } catch (error) {
        console.error('Failed to fetch historical data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [visible, nodeId, selectedTimeRange]);

  if (!visible) {
    return null;
  }

  // 获取指标的阈值违规状态
  const getThresholdStatus = (metric: MetricData): 'normal' | 'warning' | 'critical' => {
    if (metric.thresholdViolation === 'critical') return 'critical';
    if (metric.thresholdViolation === 'warning') return 'warning';
    return 'normal';
  };

  // 获取指标的颜色
  const getMetricColor = (status: 'normal' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'critical': return '#ff4d4f';
      case 'warning': return '#faad14';
      default: return '#52c41a';
    }
  };

  // 格式化数值显示
  const formatValue = (value: number, unit: string): string => {
    if (unit === '%') {
      return value.toFixed(1);
    }
    if (unit === 'MB' || unit === 'GB') {
      return value.toFixed(2);
    }
    if (unit === 'ms') {
      return value.toFixed(0);
    }
    return value.toString();
  };

  // 绘制迷你折线图
  const renderMiniChart = (metricName: string) => {
    const data = historicalData[metricName] || [];
    if (data.length === 0) return null;

    // 取最近10个数据点
    const recentData = data.slice(-10);
    const values = recentData.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    // 生成SVG路径
    const width = 120;
    const height = 30;
    const padding = 2;

    const points = recentData.map((d, i) => {
      const x = padding + (i / (recentData.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((d.value - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    const currentMetric = metrics.find(m => m.name === metricName);
    const color = currentMetric ? getMetricColor(getThresholdStatus(currentMetric)) : '#1890ff';

    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // 趋势图组件（使用Canvas）
  const TrendChart: React.FC<{ metricName: string; data: MetricData[] }> = ({ metricName, data }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
      if (!canvasRef.current || data.length === 0) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // 清空画布
      ctx.clearRect(0, 0, width, height);

      // 绘制背景网格
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 绘制数据曲线
      const values = data.map(d => d.value);
      const max = Math.max(...values);
      const min = Math.min(...values);
      const range = max - min || 1;

      const currentMetric = metrics.find(m => m.name === metricName);
      const color = currentMetric ? getMetricColor(getThresholdStatus(currentMetric)) : '#1890ff';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.value - min) / range) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // 绘制最大最小值标签
      ctx.fillStyle = '#595959';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${max.toFixed(1)}`, 5, 15);
      ctx.fillText(`${min.toFixed(1)}`, 5, height - 5);

    }, [data, metricName, metrics]);

    if (data.length === 0) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#8c8c8c',
          background: '#f5f5f5',
          borderRadius: '4px'
        }}>
          暂无历史数据
        </div>
      );
    }

    return (
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        style={{ width: '100%', height: 'auto' }}
      />
    );
  };

  return (
    <>
      <div className={`drawer-overlay ${visible ? 'visible' : ''}`} onClick={onClose} />
      <div className={`metrics-detail-drawer ${visible ? 'open' : ''}`}>
        {/* 抽屉头部 */}
        <div className="drawer-header">
          <div className="header-info">
            <h3>{nodeName}</h3>
            <span className="node-type-badge">{nodeType}</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* 抽屉内容 */}
        <div className="drawer-content">
          {/* 实时指标卡片区 */}
          <section className="metrics-section">
            <h4>实时指标</h4>
            <div className="metrics-cards">
              {metrics.length === 0 ? (
                <div className="empty-state">
                  <p>暂无监控数据</p>
                  <small>请等待指标采集任务执行</small>
                </div>
              ) : (
                metrics.map((metric, index) => {
                  const status = getThresholdStatus(metric);
                  const color = getMetricColor(status);

                  return (
                    <div key={index} className="metric-card">
                      <div className="metric-header">
                        <span className="metric-name">{metric.name}</span>
                        {metric.thresholdViolation && (
                          <span className={`status-badge ${status}`}>
                            {metric.thresholdViolation === 'critical' ? '严重' : '警告'}
                          </span>
                        )}
                      </div>
                      <div className="metric-value">
                        <span className="value" style={{ color }}>
                          {formatValue(metric.value, metric.unit)}
                        </span>
                        <span className="unit">{metric.unit}</span>
                      </div>
                      <div className="metric-timestamp">
                        更新于 {new Date(metric.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="mini-chart">
                        {renderMiniChart(metric.name)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 历史趋势图表区 */}
          <section className="trend-section">
            <div className="section-header">
              <h4>历史趋势</h4>
              <div className="time-range-selector">
                {(['1h', '6h', '24h', '7d'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    className={`range-btn ${selectedTimeRange === range ? 'active' : ''}`}
                    onClick={() => setSelectedTimeRange(range)}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <p>加载中...</p>
              </div>
            ) : metrics.length === 0 ? (
              <div className="empty-state">
                <p>暂无历史数据</p>
              </div>
            ) : (
              <div className="trend-charts">
                {metrics.map((metric, index) => (
                  <div key={index} className="trend-chart-container">
                    <h5>{metric.name} ({metric.unit})</h5>
                    <TrendChart metricName={metric.name} data={historicalData[metric.name] || []} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default MetricsDetailDrawer;
