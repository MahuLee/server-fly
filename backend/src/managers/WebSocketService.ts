import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { NodeState, MetricData } from '../types';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * WebSocket 客户端连接信息
 */
interface ClientConnection {
  ws: WebSocket;
  envId: string;
  clientId: string;
  connectedAt: Date;
}

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
 * WebSocket 服务
 * 负责推送实时状态更新和指标更新到前端客户端
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private connectCallbacks: Array<(clientId: string, envId: string) => void> = [];
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * 启动 WebSocket 服务器
   * @param server HTTP 服务器实例
   */
  start(server: Server): void {
    if (this.wss) {
      logger.warn('WebSocket server is already running');
      return;
    }

    // 创建 WebSocket 服务器
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket, request) => {
      this.handleConnection(ws, request);
    });

    // 启动心跳检测
    this.startPingInterval();

    logger.info('WebSocket server started');
  }

  /**
   * 停止 WebSocket 服务器
   */
  stop(): void {
    if (!this.wss) {
      return;
    }

    // 停止心跳检测
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // 关闭所有客户端连接
    this.clients.forEach((client) => {
      client.ws.close();
    });
    this.clients.clear();

    // 关闭服务器
    this.wss.close();
    this.wss = null;

    logger.info('WebSocket server stopped');
  }

  /**
   * 处理新的客户端连接
   * @param ws WebSocket 连接
   * @param request HTTP 请求
   */
  private handleConnection(ws: WebSocket, request: any): void {
    // 从查询参数中获取环境ID
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const envId = url.searchParams.get('envId') || 'default';
    const clientId = this.generateClientId();

    const client: ClientConnection = {
      ws,
      envId,
      clientId,
      connectedAt: new Date()
    };

    this.clients.set(clientId, client);

    logger.info(`Client ${clientId} connected to environment ${envId}`);

    // 通知连接回调
    this.notifyClientConnect(clientId, envId);

    // 发送欢迎消息
    this.sendMessage(ws, {
      type: 'ping',
      data: { message: 'Connected to WebSocket server', clientId },
      timestamp: new Date().toISOString()
    });

    // 处理客户端消息
    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    // 处理客户端断开
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // 处理错误
    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
    });
  }

  /**
   * 处理客户端消息
   * @param clientId 客户端ID
   * @param data 消息数据
   */
  private handleMessage(clientId: string, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;

      // 处理 pong 消息
      if (message.type === 'pong') {
        // 客户端响应心跳，不需要特殊处理
        return;
      }

      logger.debug(`Received message from client ${clientId}:`, message);
    } catch (error) {
      logger.error(`Failed to parse message from client ${clientId}:`, error);
    }
  }

  /**
   * 处理客户端断开
   * @param clientId 客户端ID
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      logger.info(`Client ${clientId} disconnected from environment ${client.envId}`);
      this.clients.delete(clientId);
    }
  }

  /**
   * 广播状态更新到指定环境的所有客户端
   * @param envId 环境ID
   * @param nodeId 节点ID
   * @param state 节点状态
   */
  broadcastStateUpdate(envId: string, nodeId: string, state: NodeState): void {
    logger.info(`[WS] broadcastStateUpdate: envId=${envId}, nodeId=${nodeId}, status=${state.status}`);
    
    const message: WebSocketMessage = {
      type: 'state_update',
      envId,
      nodeId,
      data: state,
      timestamp: new Date().toISOString()
    };

    // 广播到所有客户端（不区分环境）
    this.broadcastToAll(message);
  }

  /**
   * 广播指标更新到指定环境的所有客户端
   * @param envId 环境ID
   * @param nodeId 节点ID
   * @param metrics 指标数据
   */
  broadcastMetricsUpdate(envId: string, nodeId: string, metrics: MetricData[]): void {
    logger.info(`[WS] broadcastMetricsUpdate: envId=${envId}, nodeId=${nodeId}, metricsCount=${metrics.length}`);
    
    const message: WebSocketMessage = {
      type: 'metrics_update',
      envId,
      nodeId,
      data: metrics,
      timestamp: new Date().toISOString()
    };

    // 广播到所有客户端（不区分环境）
    this.broadcastToAll(message);
  }

  /**
   * 向所有客户端广播消息（全局广播）
   * @param message 消息
   */
  private broadcastToAll(message: WebSocketMessage): void {
    let sentCount = 0;
    let totalClients = 0;

    this.clients.forEach((client) => {
      totalClients++;
      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
        sentCount++;
      } else {
        logger.warn(`Client ${client.clientId} is not in OPEN state: ${client.ws.readyState}`);
      }
    });

    if (message.type === 'state_update' || message.type === 'metrics_update') {
      logger.info(`Broadcasted ${message.type} to ${sentCount}/${totalClients} clients (envId=${message.envId}, nodeId=${message.nodeId})`);
    } else {
      logger.debug(`Broadcasted ${message.type} to ${sentCount} clients (global)`);
    }
  }

  /**
   * 向指定环境的所有客户端广播消息（保留此方法以备将来使用）
   * @param envId 环境ID
   * @param message 消息
   */
  private broadcastToEnvironment(envId: string, message: WebSocketMessage): void {
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.envId === envId && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
        sentCount++;
      }
    });

    logger.debug(`Broadcasted ${message.type} to ${sentCount} clients in environment ${envId}`);
  }

  /**
   * 发送消息到客户端
   * @param ws WebSocket 连接
   * @param message 消息
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    try {
      const messageStr = JSON.stringify(message);
      ws.send(messageStr);
      
      // 添加详细日志（仅用于调试，生产环境应移除）
      if (message.type === 'state_update' || message.type === 'metrics_update') {
        logger.info(`[WS] Sent ${message.type}: envId=${message.envId}, nodeId=${message.nodeId}, size=${messageStr.length}B`);
      }
    } catch (error) {
      logger.error('[WS] Failed to send message:', error);
    }
  }

  /**
   * 启动心跳检测
   */
  private startPingInterval(): void {
    // 从环境变量读取心跳间隔，默认30秒
    const pingInterval = parseInt(process.env.WEBSOCKET_PING_INTERVAL || '30') * 1000;
    
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          this.sendMessage(client.ws, {
            type: 'ping',
            timestamp: new Date().toISOString()
          });
        }
      });
    }, pingInterval);
  }

  /**
   * 监听客户端连接事件
   * @param callback 回调函数
   */
  onClientConnect(callback: (clientId: string, envId: string) => void): void {
    this.connectCallbacks.push(callback);
  }

  /**
   * 通知客户端连接
   * @param clientId 客户端ID
   * @param envId 环境ID
   */
  private notifyClientConnect(clientId: string, envId: string): void {
    this.connectCallbacks.forEach((callback) => {
      try {
        callback(clientId, envId);
      } catch (error) {
        logger.error('Error in client connect callback:', error);
      }
    });
  }

  /**
   * 生成客户端ID
   * @returns 客户端ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * 获取连接的客户端数量
   * @returns 客户端数量
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 获取指定环境的客户端数量
   * @param envId 环境ID
   * @returns 客户端数量
   */
  getEnvironmentClientCount(envId: string): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.envId === envId) {
        count++;
      }
    });
    return count;
  }
}

export default WebSocketService;
