import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';
import PropertyDrawer from './components/PropertyDrawer';
import MainMenu from './components/MainMenu';
import { Environment, GraphData, Node, NodeState, MetricData } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { API_ENDPOINTS } from './config/api';
import { MENU_ITEMS, MenuItemId } from './config/menuItems';
import { getViewComponent } from './config/viewConfig';

type Theme = 'tech-dark' | 'minimalist';

// 获取默认菜单项（第一个菜单项）
const DEFAULT_MENU_ITEM = MENU_ITEMS[0]?.id || 'architecture';

function App() {
  const [viewMode, setViewMode] = useState<MenuItemId>(DEFAULT_MENU_ITEM);
  const [theme, setTheme] = useState<Theme>('tech-dark');
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const { isConnected, subscribeToStateUpdates, subscribeToMetricsUpdates } = useWebSocket();

  // 应用主题
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 加载环境列表
  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.environments);
      const result = await response.json();
      if (result.success && result.data) {
        setEnvironments(result.data);
      }
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  // 订阅实时更新（仅在监控视图中生效）
  useEffect(() => {
    if (viewMode !== 'monitoring' || !currentEnvironment) return;

    const unsubscribeState = subscribeToStateUpdates((nodeId: string, state: NodeState, envId?: string) => {
      if (envId && envId !== currentEnvironment.id) return;
      
      setGraphData((prevData) => ({
        ...prevData,
        nodes: prevData.nodes.map((node) =>
          node.id === nodeId ? { ...node, state } : node
        )
      }));
    });

    const unsubscribeMetrics = subscribeToMetricsUpdates((nodeId: string, metrics: MetricData[], envId?: string) => {
      if (envId && envId !== currentEnvironment.id) return;
      
      setGraphData((prevData) => ({
        ...prevData,
        nodes: prevData.nodes.map((node) =>
          node.id === nodeId && node.state
            ? { ...node, state: { ...node.state, metrics } }
            : node
        )
      }));
    });

    return () => {
      unsubscribeState();
      unsubscribeMetrics();
    };
  }, [subscribeToStateUpdates, subscribeToMetricsUpdates, viewMode, currentEnvironment]);

  const handleEnvironmentChange = (env: Environment) => {
    setCurrentEnvironment(env);
    loadGraphData(env.id);
  };

  const loadGraphData = async (envId: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.environmentGraph(envId));
      const result = await response.json();
      if (result.success && result.data) {
        setGraphData(result.data);
      }
    } catch (error) {
      console.error('Failed to load graph data:', error);
    }
  };

  const handleGraphChange = (data: GraphData | ((prev: GraphData) => GraphData)) => {
    setGraphData(typeof data === 'function' ? data(graphData) : data);
  };

  const handleNodeSelect = (nodeId: string) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    setSelectedNode(node || null);
  };

  const handleNodeDeselect = () => {
    setSelectedNode(null);
    setDrawerVisible(false);
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setDrawerVisible(true);
    }
  };

  const handleCustomNodeDoubleClick = (nodeId: string) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) {
      toast.success(`查看节点详情: ${node.label}`, { duration: 2000 });
    }
  };

  const handlePropertySave = (updatedNode: Node) => {
    setGraphData({
      ...graphData,
      nodes: graphData.nodes.map(node =>
        node.id === updatedNode.id ? updatedNode : node
      )
    });
  };

  const saveGraphData = async (envId: string, data: GraphData) => {
    const response = await fetch(API_ENDPOINTS.environmentGraph(envId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '保存架构图失败');
    }

    return result.data;
  };

  const handleSave = async () => {
    if (!currentEnvironment) return;

    try {
      await saveGraphData(currentEnvironment.id, graphData);
      toast.success('架构图已保存');
    } catch (error) {
      console.error('Failed to save graph data:', error);
      toast.error('保存失败，请重试');
    }
  };

  const handleExport = () => {
    if (!currentEnvironment) return;

    try {
      const dataStr = JSON.stringify(graphData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentEnvironment.name}-architecture.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export graph data:', error);
      toast.error('导出失败，请重试');
    }
  };

  const handleExportImage = (format: 'png' | 'svg') => {
    if ((window as any).__graphCanvasExportImage) {
      (window as any).__graphCanvasExportImage(format);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setGraphData(data);
          toast.success('架构图已导入');
        } catch (error) {
          console.error('Failed to import graph data:', error);
          toast.error('导入失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleRefresh = async () => {
    if (!currentEnvironment) return;

    try {
      await loadGraphData(currentEnvironment.id);
      toast.success('数据已刷新');
    } catch (error) {
      console.error('Failed to refresh graph data:', error);
      toast.error('刷新失败，请重试');
    }
  };

  // 渲染当前视图
  const renderCurrentView = () => {
    const ViewComponent = getViewComponent(viewMode);

    const viewProps: Record<MenuItemId, any> = {
      architecture: {
        currentEnvironment,
        sidebarVisible,
        graphData,
        onEnvironmentChange: handleEnvironmentChange,
        onSidebarToggle: () => setSidebarVisible(!sidebarVisible),
        onSave: handleSave,
        onExport: handleExport,
        onExportImage: handleExportImage,
        onImport: handleImport,
        onRefresh: handleRefresh,
        onGraphChange: handleGraphChange,
        onNodeSelect: handleNodeSelect,
        onNodeDeselect: handleNodeDeselect,
        onNodeDoubleClick: handleNodeDoubleClick,
      },
      monitoring: {
        environments,
        onEnvironmentSelect: handleEnvironmentChange,
        onCustomNodeDoubleClick: handleCustomNodeDoubleClick,
      },
    };

    return <ViewComponent {...(viewProps[viewMode] || {})} />;
  };

  return (
    <div className="App">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: theme === 'tech-dark' ? '#1f2952' : '#363636',
            color: '#fff',
            fontSize: '14px',
            borderRadius: '8px',
            padding: '12px 16px',
            border: theme === 'tech-dark' ? '1px solid #2d3a5f' : 'none',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <header className="App-header">
        <h1>ServerFLY</h1>
        <div className="header-right">
          <div className="theme-switcher">
            <span className="theme-label">
              {theme === 'tech-dark' ? '科技黑' : '简约白'}
            </span>
            <div 
              className="theme-switch" 
              onClick={() => setTheme(theme === 'tech-dark' ? 'minimalist' : 'tech-dark')}
            >
              <div className="theme-switch-slider" />
            </div>
          </div>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {currentEnvironment ? (
            <svg width="60" height="24" viewBox="0 0 60 24" className="connection-icon">
              <defs>
                {/* 定义渐变遮罩，用于创建从右向左的进度效果 */}
                <mask id="progressMask">
                  <rect x="0" y="0" width="60" height="24" fill="white">
                    <animate
                      attributeName="x"
                      from="60"
                      to="-60"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </mask>
              </defs>
              {isConnected ? (
                <>
                  {/* 背景折线 - 使用主题背景色 */}
                  <polyline
                    points="0,12 10,12 15,4 20,20 25,12 35,12 40,4 45,20 50,12 60,12"
                    fill="none"
                    stroke={theme === 'tech-dark' ? 'rgba(20, 27, 58, 0.6)' : 'rgba(248, 250, 252, 0.6)'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* 前景折线 - 亮绿色，带进度遮罩 */}
                  <polyline
                    points="0,12 10,12 15,4 20,20 25,12 35,12 40,4 45,20 50,12 60,12"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="heartbeat-line"
                    mask="url(#progressMask)"
                  />
                </>
              ) : (
                <>
                  {/* 背景直线 - 暗红色 */}
                  <line
                    x1="0"
                    y1="12"
                    x2="60"
                    y2="12"
                    stroke="rgba(238, 14, 14, 0.9)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* 前景直线 - 深红色，带进度遮罩 */}
                  <line
                    x1="0"
                    y1="12"
                    x2="60"
                    y2="12"
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="flatline"
                    mask="url(#progressMask)"
                  />
                  {/* 淡白色光点 - 从左向右移动 */}
                  <circle
                    r="3"
                    fill="rgba(196, 176, 176, 0.8)"
                    className="flatline-dot"
                  >
                    <animate
                      attributeName="cx"
                      from="0"
                      to="60"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="cy"
                      values="12"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
              )}
            </svg>
          ) : (
            <span style={{ fontSize: '12px', color: '#6b7280' }}>未选择环境</span>
          )}
          </div>
        </div>
      </header>

      <MainMenu
        items={MENU_ITEMS}
        activeItem={viewMode}
        onItemClick={(itemId) => setViewMode(itemId as MenuItemId)}
      />

      <div className="App-content">
        {renderCurrentView()}
      </div>

      <PropertyDrawer
        visible={drawerVisible}
        node={selectedNode}
        nodes={graphData.nodes}
        onClose={() => setDrawerVisible(false)}
        onSave={handlePropertySave}
      />
    </div>
  );
}

export default App;
