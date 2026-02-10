import React, { createContext, useContext, ReactNode } from 'react';

export type ViewMode = 'architecture' | 'monitoring';

export interface ViewConfig {
  mode: ViewMode;
  // 节点相关配置
  showStatusIndicator: boolean;      // 是否显示状态指示器
  showAnchorsOnHover: boolean;       // 悬停时是否显示锚点
  showTooltipOnHover: boolean;       // 悬停时是否显示 tooltip
  enableNodeResize: boolean;         // 是否允许调整节点大小
  enableNodeDrag: boolean;           // 是否允许拖动节点
  enableEdgeEdit: boolean;           // 是否允许编辑连线
  // 交互行为配置
  onNodeDoubleClick: 'editProperties' | 'custom' | 'none';  // 双击节点的行为
  // 只读模式
  readOnly: boolean;
}

interface ViewContextType {
  config: ViewConfig;
}

const defaultArchitectureConfig: ViewConfig = {
  mode: 'architecture',
  showStatusIndicator: false,
  showAnchorsOnHover: true,
  showTooltipOnHover: false,
  enableNodeResize: true,
  enableNodeDrag: true,
  enableEdgeEdit: true,
  onNodeDoubleClick: 'editProperties',
  readOnly: false,
};

const defaultMonitoringConfig: ViewConfig = {
  mode: 'monitoring',
  showStatusIndicator: true,
  showAnchorsOnHover: false,
  showTooltipOnHover: true,
  enableNodeResize: false,
  enableNodeDrag: false,
  enableEdgeEdit: false,
  onNodeDoubleClick: 'custom',
  readOnly: true,
};

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const useViewConfig = () => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useViewConfig must be used within ViewProvider');
  }
  return context;
};

interface ViewProviderProps {
  mode: ViewMode;
  children: ReactNode;
  customConfig?: Partial<ViewConfig>;
}

export const ViewProvider: React.FC<ViewProviderProps> = ({ 
  mode, 
  children,
  customConfig 
}) => {
  const baseConfig = mode === 'architecture' 
    ? defaultArchitectureConfig 
    : defaultMonitoringConfig;
  
  const config: ViewConfig = {
    ...baseConfig,
    ...customConfig,
    mode, // 确保 mode 不被覆盖
  };

  return (
    <ViewContext.Provider value={{ config }}>
      {children}
    </ViewContext.Provider>
  );
};
