import React, { useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { useViewConfig } from '../../contexts/ViewContext';
import './NodeStyles.css';

export interface GenericNodeData {
  label: string;
  icon: string;
  status: 'running' | 'error' | 'warning' | 'unknown';
  message?: string;
  port?: number;
  size?: [number, number];
}

const GenericNode: React.FC<NodeProps<GenericNodeData>> = ({ data, selected, id }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { config } = useViewConfig();

  return (
    <div
      className={`custom-node generic-node status-${data.status} ${selected ? 'selected' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
      }}
    >
      {/* 节点大小调节器 - 根据配置显示 */}
      {config.enableNodeResize && (
        <NodeResizer
          isVisible={selected}
          minWidth={100}
          minHeight={30}
          handleStyle={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            border: '2px solid var(--bg-secondary)'
          }}
          lineStyle={{
            borderColor: 'var(--color-primary)',
            borderWidth: '1px'
          }}
        />
      )}
      
      {/* 状态指示器 - 根据配置显示 */}
      {config.showStatusIndicator && (
        <div className={`node-status-indicator ${data.status}`} />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
        <span className="node-icon">{data.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="node-label">
            {data.label}{data.port ? `：${data.port}` : ''}
          </div>
        </div>
      </div>
      
      {/* 消息 - 如果有的话 */}
      {data.message && (
        <div className="node-sublabel" style={{ marginTop: '2px', paddingLeft: '22px', width: 'calc(100% - 22px)' }}>
          {data.message}
        </div>
      )}
    </div>
  );
};

export default GenericNode;
