import React from 'react';
import { ViewProvider } from '../contexts/ViewContext';
import MonitoringView from '../components/MonitoringView';
import { Environment } from '../types';

interface MonitoringViewWrapperProps {
  environments: Environment[];
  onEnvironmentSelect: (env: Environment) => void;
  onCustomNodeDoubleClick: (nodeId: string) => void;
}

const MonitoringViewWrapper: React.FC<MonitoringViewWrapperProps> = ({
  environments,
  onEnvironmentSelect,
  onCustomNodeDoubleClick,
}) => {
  return (
    <ViewProvider mode="monitoring">
      <MonitoringView
        environments={environments}
        onEnvironmentSelect={onEnvironmentSelect}
        onCustomNodeDoubleClick={onCustomNodeDoubleClick}
      />
    </ViewProvider>
  );
};

export default MonitoringViewWrapper;
