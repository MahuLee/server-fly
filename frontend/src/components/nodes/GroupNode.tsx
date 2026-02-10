import React, { useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { useViewConfig } from '../../contexts/ViewContext';
import './NodeStyles.css';

export interface GroupNodeData {
  label: string;
  size?: [number, number];
  borderWidth?: number;
  borderColor?: string;
  description?: string;
}

const GroupNode: React.FC<NodeProps<GroupNodeData>> = ({ data, selected, id }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { config } = useViewConfig();
  
  // 从 data 中获取自定义属性，提供默认值
  const borderWidth = data.borderWidth || 3;
  const borderColor = data.borderColor || 'rgba(150, 150, 150, 0.3)';
  const description = data.description;

  return (
    <div
      className={`custom-node group-node ${selected ? 'selected' : ''}`}
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
        border: selected ? `${borderWidth}px dashed var(--color-primary)` : `${borderWidth}px dashed ${borderColor}`,
        borderRadius: '8px',
        padding: '12px',
        pointerEvents: 'none', // 内部不响应点击
      }}
    >
      {/* 边框区域 - 可点击 */}
      <div
        style={{
          position: 'absolute',
          top: -borderWidth,
          left: -borderWidth,
          right: -borderWidth,
          bottom: -borderWidth,
          pointerEvents: 'stroke', // 只有边框响应
          border: `${borderWidth}px solid transparent`,
        }}
      />
      
      {/* 节点大小调节器 - 根据配置显示 */}
      {config.enableNodeResize && (
        <NodeResizer
          isVisible={selected}
          minWidth={200}
          minHeight={150}
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
      
      {/* 描述信息 - 左上角，只在有描述时显示 */}
      {description && (
        <div style={{ pointerEvents: 'none' }}>
          <div className="node-label" style={{ fontSize: '13px', fontWeight: 500 }}>
            {description}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupNode;
