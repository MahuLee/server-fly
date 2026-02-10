import React, { useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { useViewConfig } from '../../contexts/ViewContext';
import './NodeStyles.css';
// 服务器节点
export interface ServerNodeData {
  label: string;
  status: 'running' | 'error' | 'warning' | 'unknown';
  message?: string;
  ip?: string;
  port?: number;
  size?: [number, number];
}

const ServerNode: React.FC<NodeProps<ServerNodeData>> = ({ data, selected, id }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { config } = useViewConfig();

  return (
    <div
      className={`custom-node server-node ${selected ? 'selected' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        background: 'transparent',
        border: selected ? '4px dashed var(--color-primary)' : '4px dashed rgba(143, 134, 134, 0.3)',
        pointerEvents: 'none', // 内部不响应点击
      }}
    >
      {/* 边框区域 - 可点击 */}
      <div
        style={{
          position: 'absolute',
          top: -3,
          left: -3,
          right: -3,
          bottom: -3,
          pointerEvents: 'stroke', // 只有边框响应
          border: '3px solid transparent',
        }}
      />
      
      {/* 节点大小调节器 - 根据配置显示 */}
      {config.enableNodeResize && (
        <NodeResizer
          isVisible={selected}
          minWidth={120}
          minHeight={60}
          handleStyle={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            border: '2px solid var(--bg-secondary)',
            pointerEvents: 'all',
          }}
          lineStyle={{
            borderColor: 'var(--color-primary)',
            borderWidth: '1px'
          }}
        />
      )}
      
      {/* 状态指示器 - 根据配置显示 */}
      {config.showStatusIndicator && (
        <div className={`node-status-indicator ${data.status}`} style={{ pointerEvents: 'none' }} />
      )}
      
      {/* 锚点 - 根据配置控制显示 */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        className="custom-handle"
        style={{ 
          opacity: config.showAnchorsOnHover ? (selected || isHovered ? 1 : 0.3) : 0,
          pointerEvents: config.readOnly ? 'none' : 'all'
        }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom"
        className="custom-handle"
        style={{ 
          opacity: config.showAnchorsOnHover ? (selected || isHovered ? 1 : 0.3) : 0,
          pointerEvents: config.readOnly ? 'none' : 'all'
        }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        className="custom-handle"
        style={{ 
          opacity: config.showAnchorsOnHover ? (selected || isHovered ? 1 : 0.3) : 0,
          pointerEvents: config.readOnly ? 'none' : 'all'
        }}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left"
        className="custom-handle"
        style={{ 
          opacity: config.showAnchorsOnHover ? (selected || isHovered ? 1 : 0.3) : 0,
          pointerEvents: config.readOnly ? 'none' : 'all'
        }}
      />
      
      {/* 图标和标签 - 左上角 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', pointerEvents: 'none' }}>
        <span className="node-icon">🖥️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="node-label">
            {data.label}{data.port ? `：${data.port}` : ''}
          </div>
        </div>
      </div>
      
      {/* IP地址 - 如果有的话 */}
      {data.ip && (
        <div className="node-sublabel" style={{ marginTop: '2px', paddingLeft: '22px', pointerEvents: 'none' }}>
          {data.ip}
        </div>
      )}
    </div>
  );
};

export default ServerNode;
