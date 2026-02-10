import React, { useState, useEffect } from 'react';
import './NodeTooltip.css';

interface NodeTooltipProps {
  nodeId: string;
  label: string;
  status: string;
  message?: string;
  ip?: string;
  port?: number;
  lastCheckTime?: Date;
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
  };
  x: number;
  y: number;
  visible: boolean;
}

export const NodeTooltip: React.FC<NodeTooltipProps> = ({
  nodeId,
  label,
  status,
  message,
  ip,
  port,
  lastCheckTime,
  metrics,
  x,
  y,
  visible
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (visible) {
      // 计算 tooltip 位置，避免超出屏幕
      const tooltipWidth = 280;
      const tooltipHeight = 200;
      const padding = 10;

      let finalX = x + 15;
      let finalY = y + 15;

      // 检查右边界
      if (finalX + tooltipWidth > window.innerWidth) {
        finalX = x - tooltipWidth - 15;
      }

      // 检查底部边界
      if (finalY + tooltipHeight > window.innerHeight) {
        finalY = y - tooltipHeight - 15;
      }

      // 确保不超出左边界和顶部边界
      finalX = Math.max(padding, finalX);
      finalY = Math.max(padding, finalY);

      setPosition({ x: finalX, y: finalY });
    }
  }, [x, y, visible]);

  if (!visible) return null;

  const statusText = {
    running: '正常',
    error: '异常',
    warning: '警告',
    unknown: '未知'
  }[status] || '未知';

  // 格式化检查时间
  const formatCheckTime = (date?: Date) => {
    if (!date) return '未检查';
    
    const now = new Date();
    const checkTime = new Date(date);
    const diffMs = now.getTime() - checkTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    
    // 如果是今天，显示相对时间
    if (diffHours < 24) {
      if (diffSeconds < 60) {
        return `${diffSeconds}秒前`;
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`;
      } else {
        return `${diffHours}小时前`;
      }
    }
    
    // 否则显示具体时间
    return checkTime.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="node-tooltip"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-title">{label}</span>
        <span className={`tooltip-status status-${status}`}>{statusText}</span>
      </div>
      
      <div className="tooltip-body">
        {ip && (
          <div className="tooltip-row">
            <span className="tooltip-label">IP地址:</span>
            <span className="tooltip-value">{ip}</span>
          </div>
        )}
        
        {port && (
          <div className="tooltip-row">
            <span className="tooltip-label">端口:</span>
            <span className="tooltip-value">{port}</span>
          </div>
        )}
        
        {lastCheckTime && (
          <div className="tooltip-row">
            <span className="tooltip-label">检查时间:</span>
            <span className="tooltip-value">{formatCheckTime(lastCheckTime)}</span>
          </div>
        )}
        
        {message && (
          <div className="tooltip-row">
            <span className="tooltip-label">消息:</span>
            <span className="tooltip-value">{message}</span>
          </div>
        )}
        
        {metrics && (
          <>
            <div className="tooltip-divider" />
            <div className="tooltip-section-title">资源使用</div>
            
            {metrics.cpu !== undefined && (
              <div className="tooltip-metric">
                <div className="metric-header">
                  <span className="metric-label">CPU</span>
                  <span className="metric-value">{metrics.cpu.toFixed(1)}%</span>
                </div>
                <div className="metric-bar">
                  <div 
                    className="metric-bar-fill cpu"
                    style={{ width: `${Math.min(metrics.cpu, 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {metrics.memory !== undefined && (
              <div className="tooltip-metric">
                <div className="metric-header">
                  <span className="metric-label">内存</span>
                  <span className="metric-value">{metrics.memory.toFixed(1)}%</span>
                </div>
                <div className="metric-bar">
                  <div 
                    className="metric-bar-fill memory"
                    style={{ width: `${Math.min(metrics.memory, 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {metrics.disk !== undefined && (
              <div className="tooltip-metric">
                <div className="metric-header">
                  <span className="metric-label">磁盘</span>
                  <span className="metric-value">{metrics.disk.toFixed(1)}%</span>
                </div>
                <div className="metric-bar">
                  <div 
                    className="metric-bar-fill disk"
                    style={{ width: `${Math.min(metrics.disk, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NodeTooltip;
