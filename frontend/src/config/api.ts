/**
 * API 配置
 * 从环境变量中读取 API 基础 URL
 */

// API 基础 URL
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// WebSocket 配置
export const WS_HOST = process.env.REACT_APP_WS_HOST || 'localhost';
export const WS_PORT = process.env.REACT_APP_WS_PORT || '3001';


// 构建 WebSocket URL
export const getWebSocketUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${WS_HOST}:${WS_PORT}`;
  // console.log('WebSocket URL:', url);
  return url;
};

// API 端点
export const API_ENDPOINTS = {
  // 环境相关
  environments: `${API_BASE_URL}/api/environments`,
  environmentById: (id: string) => `${API_BASE_URL}/api/environments/${id}`,
  environmentGraph: (id: string) => `${API_BASE_URL}/api/environments/${id}/graph`,

  // 节点相关
  nodeAction: (nodeId: string, actionName: string) => `${API_BASE_URL}/api/nodes/${nodeId}/actions/${actionName}`,
  nodeMetricsHistory: (nodeId: string) => `${API_BASE_URL}/api/nodes/${nodeId}/metrics/history`,
  nodeMetricsPush: (nodeId: string) => `${API_BASE_URL}/api/nodes/${nodeId}/metrics/push`,

  // 监控指标相关
  metricsTestConnection: `${API_BASE_URL}/api/metrics/test-connection`,
};

export default {
  API_BASE_URL,
  WS_HOST,
  WS_PORT,
  getWebSocketUrl,
  API_ENDPOINTS,
};
