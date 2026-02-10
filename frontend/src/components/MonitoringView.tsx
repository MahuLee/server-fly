import React, { useEffect, useState } from 'react';
import { Environment, GraphData, NodeState, Node } from '../types';
import GraphCanvas from './GraphCanvas';
import MetricsDetailDrawer from './MetricsDetailDrawer';
import { useWebSocket } from '../hooks/useWebSocket';
import { API_ENDPOINTS } from '../config/api';
import './MonitoringView.css';

interface MonitoringViewProps {
  environments: Environment[];
  onEnvironmentSelect: (env: Environment) => void;
  onCustomNodeDoubleClick?: (nodeId: string) => void;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({
  environments,
  onEnvironmentSelect,
  onCustomNodeDoubleClick
}) => {
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [metricsDrawerVisible, setMetricsDrawerVisible] = useState(false);
  const [selectedMetricsNode, setSelectedMetricsNode] = useState<Node | null>(null);

  // 使用 WebSocket Hook 订阅实时更新（全局连接）
  const { isConnected, subscribeToStateUpdates, subscribeToMetricsUpdates } = useWebSocket();

  // 当环境列表加载后，自动选中第一个环境
  useEffect(() => {
    if (environments.length > 0 && !selectedEnv) {
      const firstEnv = environments[0];
      setSelectedEnv(firstEnv);
      onEnvironmentSelect(firstEnv);
    }
  }, [environments, selectedEnv, onEnvironmentSelect]);

  useEffect(() => {
    if (selectedEnv) {
      loadEnvironmentGraph(selectedEnv.id);
    }
  }, [selectedEnv]);

  // 订阅实时状态更新
  useEffect(() => {
    if (!selectedEnv) return;

    const unsubscribe = subscribeToStateUpdates((nodeId: string, state: NodeState, envId?: string) => {
      console.log('MonitoringView received state update for node:', nodeId, 'envId:', envId, 'state:', state);
      console.log('Current selectedEnv:', selectedEnv?.id);
      
      // 只处理当前选中环境的更新
      if (envId && envId !== selectedEnv.id) {
        console.log('Ignoring update for different environment:', envId);
        return;
      }
      
      // 更新节点状态
      setGraphData((prevData) => {
        if (!prevData) {
          console.log('No prevData, skipping update');
          return prevData;
        }
        
        // 查找节点
        const nodeIndex = prevData.nodes.findIndex(n => n.id === nodeId);
        console.log('Node index:', nodeIndex, 'for nodeId:', nodeId);
        
        if (nodeIndex === -1) {
          console.warn('Node not found:', nodeId);
          return prevData;
        }
        
        const updatedNodes = prevData.nodes.map((node) => {
          if (node.id === nodeId) {
            console.log('Updating node:', node.id, 'with state:', state);
            return { ...node, state: { ...state } };
          }
          return node;
        });
        
        const newData = {
          ...prevData,
          nodes: updatedNodes
        };
        
        console.log('Updated graphData:', newData);
        return newData;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [selectedEnv, subscribeToStateUpdates]);

  // 订阅实时指标更新
  useEffect(() => {
    if (!selectedEnv) return;

    const unsubscribe = subscribeToMetricsUpdates((nodeId: string, metrics: any, envId?: string) => {
      console.log('MonitoringView received metrics update for node:', nodeId, 'envId:', envId, 'metrics:', metrics);
      
      // 只处理当前选中环境的更新
      if (envId && envId !== selectedEnv.id) {
        console.log('Ignoring metrics update for different environment:', envId);
        return;
      }
      
      // 更新节点状态中的指标数据
      setGraphData((prevData) => {
        if (!prevData) return prevData;
        
        return {
          ...prevData,
          nodes: prevData.nodes.map((node) =>
            node.id === nodeId && node.state
              ? { ...node, state: { ...node.state, metrics } }
              : node
          )
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, [selectedEnv, subscribeToMetricsUpdates]);

  const loadEnvironmentGraph = async (envId: string) => {
    setLoading(true);
    setGraphData(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.environmentGraph(envId));
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`Loaded graph for ${envId}:`, result.data.nodes.length, 'nodes');
        setGraphData(result.data);
      } else {
        console.warn('No graph data found for environment:', envId);
        setGraphData({ nodes: [], edges: [] });
      }
    } catch (error) {
      console.error('Failed to load environment graph:', error);
      setGraphData({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleEnvironmentClick = (env: Environment) => {
    setSelectedEnv(env);
    onEnvironmentSelect(env);
  };

  // 监控视图中不允许修改图数据
  const handleGraphChange = () => {
    // 只读模式，不处理变更
  };

  const handleNodeSelect = () => {
    // 监控视图中不需要选中功能
  };

  const handleNodeDeselect = () => {
    // 监控视图中不需要取消选中功能
  };

  // 处理节点双击事件
  const handleNodeDoubleClick = (nodeId: string) => {
    if (!graphData) return;

    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node && node.properties.metrics) {
      setSelectedMetricsNode(node);
      setMetricsDrawerVisible(true);
    }

    // 调用外部传入的回调（如果有）
    if (onCustomNodeDoubleClick) {
      onCustomNodeDoubleClick(nodeId);
    }
  };

  // 当节点数据更新时，同步更新抽屉中的节点数据
  useEffect(() => {
    if (selectedMetricsNode && graphData) {
      const updatedNode = graphData.nodes.find(n => n.id === selectedMetricsNode.id);
      if (updatedNode) {
        setSelectedMetricsNode(updatedNode);
      }
    }
  }, [graphData, selectedMetricsNode]);

  return (
    <div className="monitoring-view">
      <div className={`monitoring-sidebar-container ${sidebarVisible ? 'visible' : 'hidden'}`}>
        <div className="monitoring-sidebar">
          <h3>环境列表</h3>
          <div className="environment-list">
            {environments.map(env => (
              <div
                key={env.id}
                className={`environment-item ${selectedEnv?.id === env.id ? 'active' : ''}`}
                onClick={() => handleEnvironmentClick(env)}
              >
                <div className="environment-name">{env.name}</div>
                <div className="environment-description">{env.description}</div>
              </div>
            ))}
          </div>
        </div>
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarVisible(!sidebarVisible)}
          title={sidebarVisible ? '隐藏侧边栏' : '显示侧边栏'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            {sidebarVisible ? (
              <path d="M8 10L4 6L8 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
      </div>
      <div className="monitoring-canvas-area">
        {selectedEnv ? (
          <>
            <div className="monitoring-header">
              <h2>{selectedEnv.name} - 监控一览</h2>
              <div className="monitoring-legend">
                <span className="legend-item">
                  <span className="legend-dot running"></span>
                  正常
                </span>
                <span className="legend-item">
                  <span className="legend-dot error"></span>
                  异常
                </span>
                <span className="legend-item">
                  <span className="legend-dot warning"></span>
                  警告
                </span>
                <span className="legend-item">
                  <span className="legend-dot unknown"></span>
                  未知
                </span>
              </div>
            </div>
            <div className="monitoring-graph-container">
              {loading && (
                <div className="empty-graph-state">
                  <p>正在加载...</p>
                </div>
              )}
              {!loading && graphData && graphData.nodes.length > 0 && (
                <GraphCanvas
                  key={selectedEnv.id}
                  graphData={graphData}
                  onGraphChange={handleGraphChange}
                  onNodeSelect={handleNodeSelect}
                  onNodeDeselect={handleNodeDeselect}
                  onCustomNodeDoubleClick={handleNodeDoubleClick}
                  readOnly={true}
                />
              )}
              {!loading && graphData && graphData.nodes.length === 0 && (
                <div className="empty-graph-state">
                  <p>该环境暂无服务节点，请先在"服务架构"中添加节点</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>请选择一个环境查看监控信息</p>
          </div>
        )}
      </div>

      {/* 监控详情抽屉 */}
      <MetricsDetailDrawer
        visible={metricsDrawerVisible}
        nodeId={selectedMetricsNode?.id || null}
        nodeName={selectedMetricsNode?.label || ''}
        nodeType={selectedMetricsNode?.type || ''}
        metrics={selectedMetricsNode?.state?.metrics || []}
        onClose={() => setMetricsDrawerVisible(false)}
      />
    </div>
  );
};

export default MonitoringView;
