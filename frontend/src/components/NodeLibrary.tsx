import React from 'react';
import './NodeLibrary.css';

/**
 * 节点类型定义
 */
interface NodeType {
  type: string;
  label: string;
  icon: string;
  description: string;
}

/**
 * 可用的节点类型
 */
const NODE_TYPES: NodeType[] = [
  {
    type: 'server',
    label: '服务器',
    icon: '🖥️',
    description: '物理服务器或虚拟机'
  },
  {
    type: 'service',
    label: '服务',
    icon: '⚙️',
    description: 'Web 服务或 API'
  },
  {
    type: 'database',
    label: '数据库',
    icon: '🗄️',
    description: '数据库服务'
  },
  {
    type: 'cache',
    label: '缓存',
    icon: '💾',
    description: '缓存服务'
  },
  {
    type: 'queue',
    label: '消息队列',
    icon: '📬',
    description: '消息队列服务'
  },
  {
    type: 'gateway',
    label: '网关',
    icon: '🚪',
    description: 'API 网关'
  },
  {
    type: 'loadbalancer',
    label: '负载均衡',
    icon: '⚖️',
    description: '负载均衡器'
  },
  {
    type: 'custom',
    label: '自定义',
    icon: '📦',
    description: '自定义节点'
  },
  {
    type: 'group',
    label: '群组',
    icon: '📁',
    description: '用于圈定不同的组'
  },
  {
    type: 'text',
    label: '文本',
    icon: '📝',
    description: '文本标注'
  }
];

interface NodeLibraryProps {
  onNodeTypeSelect?: (nodeType: NodeType) => void;
}

/**
 * NodeLibrary 组件
 * 显示可用的节点类型，支持拖拽到画布
 */
export const NodeLibrary: React.FC<NodeLibraryProps> = ({ onNodeTypeSelect }) => {
  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('application/json', JSON.stringify(nodeType));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (nodeType: NodeType) => {
    if (onNodeTypeSelect) {
      onNodeTypeSelect(nodeType);
    }
  };

  return (
    <div className="node-library">
      <div className="node-library-header">
        <h3>节点库</h3>
        <p className="node-library-hint">拖拽节点到画布</p>
      </div>
      <div className="node-library-content">
        {NODE_TYPES.map((nodeType) => (
          <div
            key={nodeType.type}
            className="node-library-item"
            draggable
            onDragStart={(e) => handleDragStart(e, nodeType)}
            onClick={() => handleClick(nodeType)}
            title={nodeType.description}
          >
            <div className="node-library-item-icon">{nodeType.icon}</div>
            <div className="node-library-item-label">{nodeType.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NodeLibrary;
