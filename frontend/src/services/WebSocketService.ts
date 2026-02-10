import { NodeState, MetricData } from '../types';
import { getWebSocketUrl } from '../config/api';

/**
 * WebSocket 消息类型
 */
type MessageType = 'state_update' | 'metrics_update' | 'ping' | 'pong';

/**
 * WebSocket 消息格式
 */
interface WebSocketMessage {
  type: MessageType;
  envId?: string;
  nodeId?: string;
  data?: any;
  timestamp: string;
}

/**
 * WebSocket 事件回调类型
 */
type StateUpdateCallback = (nodeId: string, state: NodeState, envId?: string) => void;
type MetricsUpdateCallback = (nodeId: string, metrics: MetricData[], envId?: string) => void;
type ConnectionCallback = () => void;

/**
 * WebSocket 客户端服务
 * 负责与后端 WebSocket 服务器通信，接收实时更新
 * 使用全局单一连接，不区分环境
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose: boolean = false;
  private isConnecting: boolean = false;

  // 回调函数
  private stateUpdateCallbacks: StateUpdateCallback[] = [];
  private metricsUpdateCallbacks: MetricsUpdateCallback[] = [];
  private connectCallbacks: ConnectionCallback[] = [];
  private disconnectCallbacks: ConnectionCallback[] = [];

  /**
   * 连接到 WebSocket 服务器（全局连接）
   * @param wsUrl WebSocket 服务器地址（可选，默认使用当前主机）
   */
  connect(wsUrl?: string): void {
    if (this.isConnecting) {
      console.log('WebSocket connection is already in progress');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected');
      return;
    }

    this.isManualClose = false;
    this.isConnecting = true;

    // 构建 WebSocket URL（不带 envId 参数，使用全局连接）
    const url = wsUrl || this.getDefaultWebSocketUrl();
    const fullUrl = `${url}?envId=global`;

    // console.log(`Connecting to WebSocket: ${fullUrl}`);

    try {
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected (global connection)');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.notifyConnect();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.notifyDisconnect();

        // 如果不是手动关闭，尝试重连
        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
    }
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * 处理接收到的消息
   * @param data 消息数据
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      console.log('WebSocketService received message:', message.type, message);

      switch (message.type) {
        case 'state_update':
          if (message.nodeId && message.data) {
            console.log('Processing state_update for nodeId:', message.nodeId, 'envId:', message.envId, 'data:', message.data);
            this.notifyStateUpdate(message.nodeId, message.data, message.envId);
          } else {
            console.warn('state_update missing nodeId or data:', message);
          }
          break;

        case 'metrics_update':
          if (message.nodeId && message.data) {
            console.log('Processing metrics_update for nodeId:', message.nodeId, 'envId:', message.envId, 'data:', message.data);
            this.notifyMetricsUpdate(message.nodeId, message.data, message.envId);
          } else {
            console.warn('metrics_update missing nodeId or data:', message);
          }
          break;

        case 'ping':
          // 响应心跳
          this.sendPong();
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, 'Raw data:', data);
    }
  }

  /**
   * 发送 pong 消息
   */
  private sendPong(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'pong',
        timestamp: new Date().toISOString()
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 获取默认的 WebSocket URL
   * @returns WebSocket URL
   */
  private getDefaultWebSocketUrl(): string {
    return getWebSocketUrl();
  }

  /**
   * 注册状态更新回调
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  onStateUpdate(callback: StateUpdateCallback): () => void {
    this.stateUpdateCallbacks.push(callback);
    return () => {
      const index = this.stateUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 注册指标更新回调
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  onMetricsUpdate(callback: MetricsUpdateCallback): () => void {
    this.metricsUpdateCallbacks.push(callback);
    return () => {
      const index = this.metricsUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.metricsUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 注册连接回调
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  onConnect(callback: ConnectionCallback): () => void {
    this.connectCallbacks.push(callback);
    return () => {
      const index = this.connectCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 注册断开回调
   * @param callback 回调函数
   * @returns 取消注册的函数
   */
  onDisconnect(callback: ConnectionCallback): () => void {
    this.disconnectCallbacks.push(callback);
    return () => {
      const index = this.disconnectCallbacks.indexOf(callback);
      if (index > -1) {
        this.disconnectCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 通知状态更新
   * @param nodeId 节点ID
   * @param state 节点状态
   * @param envId 环境ID
   */
  private notifyStateUpdate(nodeId: string, state: NodeState, envId?: string): void {
    // console.log('notifyStateUpdate called with nodeId:', nodeId, 'envId:', envId, 'state:', state);
    console.log('Number of callbacks:', this.stateUpdateCallbacks.length);
    
    this.stateUpdateCallbacks.forEach((callback, index) => {
      try {
        console.log(`Calling callback ${index} for nodeId:`, nodeId, 'envId:', envId);
        callback(nodeId, state, envId);
      } catch (error) {
        console.error('Error in state update callback:', error);
      }
    });
  }

  /**
   * 通知指标更新
   * @param nodeId 节点ID
   * @param metrics 指标数据
   * @param envId 环境ID
   */
  private notifyMetricsUpdate(nodeId: string, metrics: MetricData[], envId?: string): void {
    this.metricsUpdateCallbacks.forEach((callback) => {
      try {
        callback(nodeId, metrics, envId);
      } catch (error) {
        console.error('Error in metrics update callback:', error);
      }
    });
  }

  /**
   * 通知连接
   */
  private notifyConnect(): void {
    this.connectCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in connect callback:', error);
      }
    });
  }

  /**
   * 通知断开
   */
  private notifyDisconnect(): void {
    this.disconnectCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in disconnect callback:', error);
      }
    });
  }

  /**
   * 获取连接状态
   * @returns 是否已连接
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 清除所有回调
   */
  clearCallbacks(): void {
    this.stateUpdateCallbacks = [];
    this.metricsUpdateCallbacks = [];
    this.connectCallbacks = [];
    this.disconnectCallbacks = [];
  }
}

// 导出单例实例
export const webSocketService = new WebSocketService();

export default webSocketService;
