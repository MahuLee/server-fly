import { useEffect, useCallback, useState } from 'react';
import { webSocketService } from '../services/WebSocketService';
import { NodeState, MetricData } from '../types';

/**
 * WebSocket Hook
 * 提供 WebSocket 连接管理和实时更新订阅
 * 使用全局单一连接
 */
export function useWebSocket() {
  // 从 webSocketService 获取实时连接状态
  const [isConnected, setIsConnected] = useState(() => webSocketService.isConnected());

  // 全局连接到 WebSocket（只连接一次）
  useEffect(() => {
    // 连接到 WebSocket（全局连接）
    webSocketService.connect();

    // 立即同步连接状态
    setIsConnected(webSocketService.isConnected());

    // 注册连接状态回调
    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const unsubscribeConnect = webSocketService.onConnect(handleConnect);
    const unsubscribeDisconnect = webSocketService.onDisconnect(handleDisconnect);

    // 定期同步连接状态（防止状态不一致）
    const syncInterval = setInterval(() => {
      setIsConnected(webSocketService.isConnected());
    }, 1000);

    // 清理函数
    return () => {
      clearInterval(syncInterval);
      unsubscribeConnect();
      unsubscribeDisconnect();
      // 注意：不要在这里断开连接，保持全局连接
    };
  }, []); // 空依赖数组，只在组件挂载时连接一次

  // 订阅状态更新
  const subscribeToStateUpdates = useCallback(
    (callback: (nodeId: string, state: NodeState, envId?: string) => void) => {
      return webSocketService.onStateUpdate(callback);
    },
    []
  );

  // 订阅指标更新
  const subscribeToMetricsUpdates = useCallback(
    (callback: (nodeId: string, metrics: MetricData[], envId?: string) => void) => {
      return webSocketService.onMetricsUpdate(callback);
    },
    []
  );

  return {
    isConnected,
    subscribeToStateUpdates,
    subscribeToMetricsUpdates
  };
}

export default useWebSocket;
