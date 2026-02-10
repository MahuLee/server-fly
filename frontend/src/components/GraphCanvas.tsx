import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  ReactFlowInstance,
  BackgroundVariant,
  MarkerType,
  ConnectionMode,
  SelectionMode,
  PanOnScrollMode,
  useReactFlow
} from 'reactflow';
import { API_ENDPOINTS } from '../config/api';
import { handleApiResponse, handleNetworkError } from '../utils/apiHelper';
import 'reactflow/dist/style.css';
import { GraphData, Node as AppNode, Edge as AppEdge, ActionConfig } from '../types';
import { nodeTypes, NODE_ICONS } from './nodes';
import EdgeStylePanel, { EdgeStyle } from './EdgeStylePanel';
import CustomEdge from './CustomEdge';
import NodeTooltip from './NodeTooltip';
import { useViewConfig } from '../contexts/ViewContext';
import './GraphCanvas.css';

interface GraphCanvasProps {
  graphData: GraphData;
  onGraphChange: (data: GraphData | ((prev: GraphData) => GraphData)) => void;
  onNodeSelect: (nodeId: string) => void;
  onNodeDeselect: () => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onCustomNodeDoubleClick?: (nodeId: string) => void;
  onExportImage?: (format: 'png' | 'svg') => void;
  readOnly?: boolean;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
  actions: ActionConfig[];
}

interface ConfirmDialog {
  visible: boolean;
  actionName: string;
  actionLabel: string;
  onConfirm: () => void;
}

interface ActionResultDialog {
  visible: boolean;
  success: boolean;
  message: string;
  output?: string;
}

interface Tooltip {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string;
  content: {
    label: string;
    type: string;
    status?: string;
    message?: string;
    ip?: string;
    port?: number;
    lastCheckTime?: Date;
    metrics?: {
      cpu?: number;
      memory?: number;
      disk?: number;
    };
  };
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graphData,
  onGraphChange,
  onNodeSelect,
  onNodeDeselect,
  onNodeDoubleClick,
  onCustomNodeDoubleClick,
  readOnly = false
}) => {
  const { config } = useViewConfig();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const isInternalUpdateRef = useRef(false);
  const isSyncingRef = useRef(false); // 标记是否正在同步到父组件
  
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
    actions: []
  });
  
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    visible: false,
    actionName: '',
    actionLabel: '',
    onConfirm: () => {}
  });
  
  const [resultDialog, setResultDialog] = useState<ActionResultDialog>({
    visible: false,
    success: false,
    message: ''
  });
  
  const [tooltip, setTooltip] = useState<Tooltip>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: '',
    content: {
      label: '',
      type: ''
    }
  });

  const [edgeStylePanel, setEdgeStylePanel] = useState<{
    visible: boolean;
    edgeId: string | null;
    currentStyle: EdgeStyle;
  }>({
    visible: false,
    edgeId: null,
    currentStyle: {
      strokeWidth: 2,
      stroke: '#999',
      animated: false
    }
  });

  // 定义边类型 - 使用 useMemo 避免重复创建
  const edgeTypes = React.useMemo(() => ({
    smoothstep: CustomEdge,
    default: CustomEdge,
  }), []);

  // 转换应用节点到 React Flow 节点
  const convertToReactFlowNodes = useCallback((appNodes: AppNode[]): Node[] => {
    return appNodes.map(node => {
      const [width, height] = node.properties?.size || [120, 40];
      const icon = NODE_ICONS[node.type] || '❓';
      
      // 群组节点和服务器节点在最底层
      const zIndex = (node.type === 'server' || node.type === 'group') ? -1 : 1;
      
      // 文本节点的特殊数据
      if (node.type === 'text') {
        return {
          id: node.id,
          type: node.type,
          position: { x: node.x, y: node.y },
          data: {
            text: node.label,
            color: node.properties?.metadata?.color || 'var(--text-primary)',
            fontSize: node.properties?.metadata?.fontSize,
            textAlign: node.properties?.metadata?.textAlign,
            onTextChange: (text: string) => {
              // 这个回调会在 onPaneDoubleClick 中设置
            }
          },
          style: {
            width: width,
            height: height,
            zIndex: zIndex
          },
          zIndex: zIndex
        };
      }
      
      // 群组节点的特殊数据
      if (node.type === 'group') {
      return {
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: {
            label: node.label,
            size: [width, height],
            borderWidth: node.properties?.metadata?.borderWidth,
            borderColor: node.properties?.metadata?.borderColor,
            description: node.properties?.metadata?.description
          },
          style: {
            width: width,
            height: height,
            zIndex: zIndex
          },
          zIndex: zIndex
        };
      }
      
      // 其他节点类型
      const nodeData = {
          label: node.label,
          icon: icon,
          status: node.state?.status || 'unknown',
          message: node.state?.message,
          ip: node.properties?.ip,
          port: node.properties?.port,
          size: [width, height]
      };
      
      return {
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: nodeData,
        style: {
          width: width,
          height: height,
          zIndex: zIndex
        },
        zIndex: zIndex
      };
    });
  }, []);

  // 转换应用边到 React Flow 边
  const convertToReactFlowEdges = useCallback((appEdges: AppEdge[]): Edge[] => {
    return appEdges.map(edge => {
      const rfEdge: Edge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null,
      label: edge.label,
      type: 'smoothstep',
        animated: edge.animated || false,
        style: edge.style || {
        stroke: '#999',
        strokeWidth: 2
      }
      };

      // 如果有 markerEnd 配置，添加箭头
      if (edge.markerEnd) {
        rfEdge.markerEnd = {
          type: edge.markerEnd === 'arrowclosed' ? MarkerType.ArrowClosed : MarkerType.Arrow,
          color: edge.style?.stroke || '#999'
        };
      }

      return rfEdge;
    });
  }, []);

  // 转换 React Flow 节点回应用节点
  const convertToAppNodes = useCallback((rfNodes: Node[]): AppNode[] => {
    return rfNodes.map(node => {
      const appNode = graphData.nodes.find(n => n.id === node.id);
      
      // 文本节点的 label 从 data.text 读取，其他节点从 data.label 读取
      const label = node.type === 'text' ? node.data.text : node.data.label;
      
      // 从 style 中读取实际的宽高（用户可能拖拽调整了大小）
      const width = node.style?.width || node.data.size?.[0] || 120;
      const height = node.style?.height || node.data.size?.[1] || 40;
      
      // 构建 metadata，根据节点类型保存不同的属性
      let metadata = { ...appNode?.properties?.metadata };
      
      if (node.type === 'group') {
        // 群组节点：保存边框样式和描述
        metadata = {
          ...metadata,
          borderWidth: node.data.borderWidth,
          borderColor: node.data.borderColor,
          description: node.data.description
        };
      }
      
      return {
        id: node.id,
        type: node.type || 'service',
        label: label,
        x: node.position.x,
        y: node.position.y,
        properties: {
          ...appNode?.properties,
          size: [width, height],
          metadata: metadata
        },
        state: appNode?.state || {
          status: 'unknown',
          lastCheckTime: new Date()
        }
      };
    });
  }, [graphData.nodes]);

  // 转换 React Flow 边回应用边
  const convertToAppEdges = useCallback((rfEdges: Edge[]): AppEdge[] => {
    return rfEdges.map(edge => {
      const appEdge: AppEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        targetHandle: edge.targetHandle || undefined,
        label: typeof edge.label === 'string' ? edge.label : undefined,
        style: edge.style ? {
          stroke: edge.style.stroke as string,
          strokeWidth: edge.style.strokeWidth as number,
          strokeDasharray: edge.style.strokeDasharray as string | undefined
        } : undefined,
        animated: edge.animated,
        markerEnd: edge.markerEnd ? (typeof edge.markerEnd === 'string' ? edge.markerEnd : 'arrow') : undefined
      };
      return appEdge;
    });
  }, []);

  // 初始化和更新节点/边
  useEffect(() => {
    // 如果正在同步到父组件，忽略这次更新（避免循环）
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    
    const newNodes = convertToReactFlowNodes(graphData.nodes);
    const newEdges = convertToReactFlowEdges(graphData.edges);
    
    // 强制更新：为每个节点创建新的对象引用
    setNodes(newNodes.map(node => ({ ...node, data: { ...node.data } })));
    setEdges(newEdges);
  }, [graphData, convertToReactFlowNodes, convertToReactFlowEdges, setNodes, setEdges]);

  // 同步节点和边的变化到父组件
  useEffect(() => {
    // 使用 requestAnimationFrame 确保在渲染完成后更新
    const timeoutId = setTimeout(() => {
      if (!isInternalUpdateRef.current) {
        return;
      }
      
      const appNodes = convertToAppNodes(nodes);
      const appEdges = convertToAppEdges(edges);
      
      console.log('Syncing to parent, sample node sizes:', appNodes.slice(0, 2).map(n => ({
        id: n.id,
        label: n.label,
        size: n.properties?.size
      })));
      
      // 标记正在同步，避免触发循环更新
      isSyncingRef.current = true;
      
      onGraphChange({
        nodes: appNodes,
        edges: appEdges
      });
      
      isInternalUpdateRef.current = false;
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, convertToAppNodes, convertToAppEdges, onGraphChange]);

  // 处理键盘事件 - 方向键移动选中的节点
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果焦点在输入框中，不处理
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const step = event.shiftKey ? 50 : 10; // Shift + 方向键移动更大距离
      let dx = 0;
      let dy = 0;

      switch (event.key) {
        case 'ArrowUp':
          dy = -step;
          event.preventDefault();
          break;
        case 'ArrowDown':
          dy = step;
          event.preventDefault();
          break;
        case 'ArrowLeft':
          dx = -step;
          event.preventDefault();
          break;
        case 'ArrowRight':
          dx = step;
          event.preventDefault();
          break;
        default:
          return;
      }

      // 移动所有选中的节点
      setNodes((nds) => {
        return nds.map((node) => {
          if (node.selected) {
            return {
              ...node,
              position: {
                x: node.position.x + dx,
                y: node.position.y + dy,
              },
            };
          }
          return node;
        });
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [readOnly, setNodes]);

  // 处理节点变化
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    if (readOnly || config.readOnly) return;
    
    // 只有在节点位置或尺寸变化时才标记需要同步
    const shouldSync = changes.some(change => 
      change.type === 'position' || 
      change.type === 'dimensions' || 
      change.type === 'remove' ||
      change.type === 'add'
    );
    
    if (shouldSync) {
      console.log('Node changes that trigger sync:', changes.filter(c => 
        c.type === 'position' || c.type === 'dimensions' || c.type === 'remove' || c.type === 'add'
      ));
      isInternalUpdateRef.current = true;
    }
    
    onNodesChange(changes);
  }, [readOnly, config.readOnly, onNodesChange]);

  // 处理边变化
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (readOnly || config.readOnly) return;
    
    // 只有在边被移除或添加时才标记需要同步
    const shouldSync = changes.some(change => 
      change.type === 'remove' || 
      change.type === 'add'
    );
    
    if (shouldSync) {
      isInternalUpdateRef.current = true;
    }
    
    onEdgesChange(changes);
  }, [readOnly, config.readOnly, onEdgesChange]);

  // 处理连接
  const onConnect = useCallback((connection: Connection) => {
    if (readOnly || config.readOnly) return;
    
    setEdges((eds) => {
      const newEdges = addEdge({
        ...connection,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: '#999',
          strokeWidth: 2
        }
      }, eds);
      
      isInternalUpdateRef.current = true;
      return newEdges;
    });
  }, [readOnly, config.readOnly, setEdges]);

  // 处理拖放
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    if (!reactFlowInstance) {
      return;
    }

    const nodeTypeData = event.dataTransfer.getData('application/json');
    if (!nodeTypeData) {
      return;
    }

    try {
      const { type, label } = JSON.parse(nodeTypeData);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      // 文本节点的特殊处理
      if (type === 'text') {
        const newNode: Node = {
          id: `text-${Date.now()}`,
          type: 'text',
          position,
          data: {
            text: '双击编辑文本',
            color: 'var(--text-primary)',
            fontSize: 14,
            textAlign: 'left',
            onTextChange: (text: string) => {
              setNodes((nds) => {
                const updatedNodes = nds.map(n => 
                  n.id === newNode.id ? { ...n, data: { ...n.data, text } } : n
                );
                
                isInternalUpdateRef.current = true;
                return updatedNodes;
              });
            }
          }
        };

        setNodes((nds) => {
          const newNodes = nds.concat(newNode);
          isInternalUpdateRef.current = true;
          return newNodes;
        });
      } else if (type === 'group') {
        // 群组节点的特殊处理
        const newNode: Node = {
          id: `group-${Date.now()}`,
          type: 'group',
          position,
          data: {
            label: '群组',
            size: [300, 200],
            borderWidth: 3,
            borderColor: 'rgba(150, 150, 150, 0.3)',
            description: '' // 默认无描述
          },
          style: {
            width: 300,
            height: 200,
            zIndex: -1 // 群组在最底层
          },
          zIndex: -1
        };

        setNodes((nds) => {
          const newNodes = nds.concat(newNode);
          isInternalUpdateRef.current = true;
          return newNodes;
        });
      } else {
        // 其他节点类型 - 服务器节点默认大小为 300x200，其他为 160x80
        const defaultSize = type === 'server' ? [300, 200] : [160, 80];
        const [defaultWidth, defaultHeight] = defaultSize;
        
        const newNode: Node = {
          id: `${Date.now()}`,
          type,
          position,
          data: {
            label,
            icon: NODE_ICONS[type] || '❓',
            status: 'unknown',
            size: defaultSize
          },
          style: {
            width: defaultWidth,
            height: defaultHeight,
            zIndex: type === 'server' ? -1 : 1
          },
          zIndex: type === 'server' ? -1 : 1
        };

        setNodes((nds) => {
          const newNodes = nds.concat(newNode);
          isInternalUpdateRef.current = true;
          return newNodes;
        });
      }
    } catch (error) {
      console.error('Failed to drop node:', error);
    }
  }, [reactFlowInstance, setNodes]);

  // 处理节点点击 - 单击选中
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    onNodeSelect(node.id);
  }, [onNodeSelect]);

  // 处理边点击 - 单击选中
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    onNodeDeselect();
  }, [onNodeDeselect]);

  // 处理节点双击 - 根据配置执行不同行为
  const onNodeDoubleClickHandler = useCallback((event: React.MouseEvent, node: Node) => {
    if (config.onNodeDoubleClick === 'editProperties' && onNodeDoubleClick) {
      // 服务架构模式：打开属性抽屉
      onNodeDoubleClick(node.id);
    } else if (config.onNodeDoubleClick === 'custom' && onCustomNodeDoubleClick) {
      // 监控模式：执行自定义逻辑
      onCustomNodeDoubleClick(node.id);
    }
    // 如果是 'none'，则不执行任何操作
  }, [config.onNodeDoubleClick, onNodeDoubleClick, onCustomNodeDoubleClick]);

  // 处理边双击 - 打开样式面板
  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    // 只读模式或不允许编辑边时不打开样式面板
    if (readOnly || !config.enableEdgeEdit) return;
    
    const currentStyle: EdgeStyle = {
      strokeWidth: (edge.style?.strokeWidth as number) || 2,
      stroke: (edge.style?.stroke as string) || '#999',
      strokeDasharray: edge.style?.strokeDasharray as string | undefined,
      label: typeof edge.label === 'string' ? edge.label : undefined,
      animated: edge.animated || false,
      markerEnd: edge.markerEnd ? 'arrow' : undefined
    };

    setEdgeStylePanel({
      visible: true,
      edgeId: edge.id,
      currentStyle
    });
  }, [readOnly, config.enableEdgeEdit]);

  // 保存边样式
  const handleSaveEdgeStyle = useCallback((edgeId: string, style: EdgeStyle) => {
    setEdges((eds) => {
      const newEdges = eds.map(edge => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            label: style.label,
            animated: style.animated,
            style: {
              strokeWidth: style.strokeWidth,
              stroke: style.stroke,
              strokeDasharray: style.strokeDasharray
            },
            markerEnd: style.markerEnd ? {
              type: style.markerEnd === 'arrowclosed' ? MarkerType.ArrowClosed : MarkerType.Arrow,
              color: style.stroke
            } : undefined
          };
        }
        return edge;
      });

      // 标记需要同步到父组件
      isInternalUpdateRef.current = true;
      return newEdges;
    });
  }, [setEdges]);

  // 处理画布点击 - 取消选中
  const onPaneClick = useCallback(() => {
      setSelectedNodeId(null);
    setSelectedEdgeId(null);
      onNodeDeselect();
      setContextMenu({ visible: false, x: 0, y: 0, nodeId: null, actions: [] });
  }, [onNodeDeselect]);

  // 处理节点右键菜单
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    
    const appNode = graphData.nodes.find(n => n.id === node.id);
    if (appNode && appNode.properties.actions && appNode.properties.actions.length > 0) {
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        actions: appNode.properties.actions
      });
    }
  }, [graphData.nodes]);

  // 处理节点悬停 - 根据配置显示 tooltip
  const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    if (config.showTooltipOnHover) {
      const appNode = graphData.nodes.find(n => n.id === node.id);
      if (appNode) {
        // 群组和服务器节点不显示 tooltip
        if (appNode.type === 'group' || appNode.type === 'server') {
          return;
        }
        
        // 转换 MetricData[] 为简单对象格式
        let metricsObj: { cpu?: number; memory?: number; disk?: number; } | undefined;
        if (appNode.state?.metrics && Array.isArray(appNode.state.metrics)) {
          metricsObj = {};
          appNode.state.metrics.forEach(metric => {
            const name = metric.name.toLowerCase();
            if (name === 'cpu' || name.includes('cpu')) {
              metricsObj!.cpu = metric.value;
            } else if (name === 'memory' || name.includes('memory') || name.includes('mem')) {
              metricsObj!.memory = metric.value;
            } else if (name === 'disk' || name.includes('disk')) {
              metricsObj!.disk = metric.value;
            }
          });
        }
        
        setTooltip({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          nodeId: node.id,
          content: {
            label: appNode.label,
            type: appNode.type,
            status: appNode.state?.status,
            message: appNode.state?.message,
            ip: appNode.properties?.ip,
            port: appNode.properties?.port,
            lastCheckTime: appNode.state?.lastCheckTime,
            metrics: metricsObj
          }
        });
      }
    }
  }, [config.showTooltipOnHover, graphData.nodes]);

  const onNodeMouseLeave = useCallback(() => {
    if (config.showTooltipOnHover) {
      setTooltip({
        visible: false,
        x: 0,
        y: 0,
        nodeId: '',
        content: {
          label: '',
          type: ''
        }
      });
    }
  }, [config.showTooltipOnHover]);

  // 删除选中节点
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    
    setNodes((nds) => {
      const newNodes = nds.filter(n => n.id !== selectedNodeId);
      isInternalUpdateRef.current = true;
      return newNodes;
    });
    
    setSelectedNodeId(null);
    onNodeDeselect();
  }, [selectedNodeId, setNodes, onNodeDeselect]);

  // 执行操作
  const executeAction = async (nodeId: string, actionName: string, actionConfig: ActionConfig) => {
    try {
      const response = await fetch(API_ENDPOINTS.nodeAction(nodeId, actionName), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(actionConfig)
      });

      const data = await handleApiResponse(response);

      if (data) {
        setResultDialog({
          visible: true,
          success: data.success,
          message: data.message,
          output: data.output
        });
      }
    } catch (error: any) {
      handleNetworkError(error);
      setResultDialog({
        visible: true,
        success: false,
        message: error.message || 'Action execution failed'
      });
    }
  };

  // 处理操作点击
  const handleActionClick = (nodeId: string, actionName: string, actionConfig: ActionConfig) => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null, actions: [] });

    if (actionConfig.requireConfirmation) {
      setConfirmDialog({
        visible: true,
        actionName: actionName,
        actionLabel: actionConfig.displayName || actionName,
        onConfirm: () => {
          setConfirmDialog({ visible: false, actionName: '', actionLabel: '', onConfirm: () => {} });
          executeAction(nodeId, actionName, actionConfig);
        }
      });
    } else {
      executeAction(nodeId, actionName, actionConfig);
    }
  };

  return (
    <div className="graph-canvas-container" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClickHandler}
        onNodeContextMenu={onNodeContextMenu}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#999',
            strokeWidth: 2
          }
        }}
        connectionMode={ConnectionMode.Strict}
        deleteKeyCode={readOnly || config.readOnly ? null : 'Delete'}
        zoomOnDoubleClick={false}
        // 启用框选功能
        selectionMode={readOnly || config.readOnly ? SelectionMode.Partial : SelectionMode.Partial}
        panOnDrag={readOnly || config.readOnly ? true : [1, 2]} // 只读模式：左键拖动画布；编辑模式：鼠标中键和右键拖动画布
        selectionOnDrag={readOnly || config.readOnly ? false : true} // 编辑模式：左键框选
        panOnScroll={false} // 禁用滚轮平移（使用滚轮缩放）
        zoomOnScroll={true} // 启用滚轮缩放
        panActivationKeyCode={null} // 不需要按键激活平移
        multiSelectionKeyCode="Shift" // Shift + 点击多选
        nodesDraggable={config.enableNodeDrag}
        nodesConnectable={!config.readOnly}
      >
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
        <Controls />
      </ReactFlow>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 1000
          }}
        >
          <div className="context-menu-header">Actions</div>
          {contextMenu.actions.map((action, index) => (
            <div
              key={index}
              className="context-menu-item"
              onClick={() => {
                if (contextMenu.nodeId) {
                  handleActionClick(contextMenu.nodeId, action.name, action);
                }
              }}
            >
              {action.displayName || action.name}
            </div>
          ))}
        </div>
      )}

      {/* 确认对话框 */}
      {confirmDialog.visible && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-header">Confirm Action</div>
            <div className="dialog-body">
              Are you sure you want to execute action "{confirmDialog.actionLabel}"?
            </div>
            <div className="dialog-footer">
              <button
                className="dialog-btn dialog-btn-cancel"
                onClick={() => setConfirmDialog({ visible: false, actionName: '', actionLabel: '', onConfirm: () => {} })}
              >
                Cancel
              </button>
              <button
                className="dialog-btn dialog-btn-confirm"
                onClick={confirmDialog.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结果对话框 */}
      {resultDialog.visible && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className={`dialog-header ${resultDialog.success ? 'success' : 'error'}`}>
              {resultDialog.success ? 'Action Successful' : 'Action Failed'}
            </div>
            <div className="dialog-body">
              <p>{resultDialog.message}</p>
              {resultDialog.output && (
                <pre className="dialog-output">{resultDialog.output}</pre>
              )}
            </div>
            <div className="dialog-footer">
              <button
                className="dialog-btn dialog-btn-confirm"
                onClick={() => setResultDialog({ visible: false, success: false, message: '' })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 边样式设置面板 */}
      <EdgeStylePanel
        visible={edgeStylePanel.visible}
        edgeId={edgeStylePanel.edgeId}
        currentStyle={edgeStylePanel.currentStyle}
        onClose={() => setEdgeStylePanel({ visible: false, edgeId: null, currentStyle: { strokeWidth: 2, stroke: '#999', animated: false } })}
        onSave={handleSaveEdgeStyle}
      />

      {/* 节点悬停提示 */}
      {tooltip.visible && (
        <NodeTooltip
          nodeId={tooltip.nodeId}
          label={tooltip.content.label}
          status={tooltip.content.status || 'unknown'}
          message={tooltip.content.message}
          ip={tooltip.content.ip}
          port={tooltip.content.port}
          lastCheckTime={tooltip.content.lastCheckTime}
          metrics={tooltip.content.metrics}
          x={tooltip.x}
          y={tooltip.y}
          visible={tooltip.visible}
        />
      )}
    </div>
  );
};

export default GraphCanvas;
