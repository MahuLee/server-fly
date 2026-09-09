import React, { useState } from 'react';
import { ViewProvider } from '../contexts/ViewContext';
import EnvironmentSelector from '../components/EnvironmentSelector';
import NodeLibrary from '../components/NodeLibrary';
import Toolbar from '../components/Toolbar';
import GraphCanvas from '../components/GraphCanvas';
import { Environment, GraphData } from '../types';

interface ArchitectureViewProps {
  currentEnvironment: Environment | null;
  sidebarVisible: boolean;
  graphData: GraphData;
  onEnvironmentChange: (env: Environment) => void;
  onSidebarToggle: () => void;
  onSave: () => void;
  onExport: () => void;
  onExportImage: (format: 'png' | 'svg') => void;
  onImport: () => void;
  onRefresh: () => void;
  onGraphChange: (data: GraphData | ((prev: GraphData) => GraphData)) => void;
  onNodeSelect: (nodeId: string) => void;
  onNodeDeselect: () => void;
  onNodeDoubleClick: (nodeId: string) => void;
}

const ArchitectureView: React.FC<ArchitectureViewProps> = ({
  currentEnvironment,
  sidebarVisible,
  graphData,
  onEnvironmentChange,
  onSidebarToggle,
  onSave,
  onExport,
  onExportImage,
  onImport,
  onRefresh,
  onGraphChange,
  onNodeSelect,
  onNodeDeselect,
  onNodeDoubleClick,
}) => {
  const [nodeLibraryVisible, setNodeLibraryVisible] = useState(true);

  return (
    <ViewProvider mode="architecture">
      <div className={`sidebar-container ${sidebarVisible ? 'visible' : 'hidden'}`}>
        <div className="sidebar">
          <EnvironmentSelector onEnvironmentChange={onEnvironmentChange} />
        </div>
        <button
          className="sidebar-toggle-btn"
          onClick={onSidebarToggle}
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
      <div className="main-content">
        {currentEnvironment ? (
          <div className="workspace">
            <Toolbar
              onSave={onSave}
              onExport={onExport}
              onExportImage={onExportImage}
              onImport={onImport}
              onRefresh={onRefresh}
            />
            <div className="workspace-content">
              <GraphCanvas
                graphData={graphData}
                onGraphChange={onGraphChange}
                onNodeSelect={onNodeSelect}
                onNodeDeselect={onNodeDeselect}
                onNodeDoubleClick={onNodeDoubleClick}
              />
              {/* 悬浮节点库面板 */}
              <div className={`node-library-panel ${nodeLibraryVisible ? 'visible' : 'hidden'}`}>
                <NodeLibrary />
              </div>
              {/* 节点库切换按钮（独立于面板，隐藏时仍可见） */}
              <button
                className={`node-library-toggle-btn ${nodeLibraryVisible ? 'visible' : 'hidden'}`}
                onClick={() => setNodeLibraryVisible(!nodeLibraryVisible)}
                title={nodeLibraryVisible ? '隐藏节点库' : '显示节点库'}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  {nodeLibraryVisible ? (
                    <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  ) : (
                    <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  )}
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-workspace">
            <p>请选择一个环境开始设计架构图</p>
          </div>
        )}
      </div>
    </ViewProvider>
  );
};

export default ArchitectureView;
