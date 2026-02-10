import { query } from '../database/init';
import { WebSocketService } from './WebSocketService';
import { DataCollector } from './DataCollector';
import { NodeState, MetricData } from '../types';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 待推送的节点数据
 */
interface PendingPush {
  envId: string;
  nodeId: string;
  type: 'state' | 'metrics';
  data: any;
  timestamp: number;
}

/**
 * 数据推送调度器（事件驱动 + 防抖）
 * 当健康检查或指标收集完成时立即推送，使用防抖机制避免频繁推送
 */
export class DataPushScheduler {
  private webSocketService: WebSocketService;
  private dataCollector: DataCollector;
  
  // 防抖配置
  private debounceMs: number;
  private pendingPushes: Map<string, PendingPush> = new Map();
  private pushTimer: NodeJS.Timeout | null = null;
  
  // 心跳配置
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatIntervalMs: number;
  private lastPushTime: number = Date.now();

  constructor(webSocketService: WebSocketService, dataCollector: DataCollector) {
    this.webSocketService = webSocketService;
    this.dataCollector = dataCollector;
    
    // 从环境变量读取配置
    // 防抖延迟：默认 500ms，多次更新会合并
    this.debounceMs = parseInt(process.env.PUSH_DEBOUNCE_MS || '500');
    
    // 心跳间隔：默认 30 秒，长时间无更新时发送心跳
    this.heartbeatIntervalMs = parseInt(process.env.PUSH_HEARTBEAT_INTERVAL || '30') * 1000;
  }

  /**
   * 启动数据推送调度器
   */
  start(): void {
    logger.info(`Starting event-driven data push scheduler`);
    logger.info(`  - Debounce: ${this.debounceMs}ms`);
    logger.info(`  - Heartbeat: ${this.heartbeatIntervalMs / 1000}s`);
    
    // 启动心跳定时器
    this.startHeartbeat();
  }

  /**
   * 停止数据推送调度器
   */
  stop(): void {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.pendingPushes.clear();
    logger.info('Data push scheduler stopped');
  }

  /**
   * 推送节点健康状态（事件驱动）
   * 由 HealthCheckScheduler 在检查完成后调用
   * @param envId 环境ID
   * @param nodeId 节点ID
   * @param state 节点状态
   */
  pushNodeState(envId: string, nodeId: string, state: NodeState): void {
    const key = `${envId}:${nodeId}:state`;
    
    this.pendingPushes.set(key, {
      envId,
      nodeId,
      type: 'state',
      data: state,
      timestamp: Date.now()
    });
    
    this.schedulePush();
  }

  /**
   * 推送节点指标数据（事件驱动）
   * 由指标收集器在收集完成后调用
   * @param envId 环境ID
   * @param nodeId 节点ID
   * @param metrics 指标数据
   */
  pushNodeMetrics(envId: string, nodeId: string, metrics: MetricData[]): void {
    const key = `${envId}:${nodeId}:metrics`;
    
    this.pendingPushes.set(key, {
      envId,
      nodeId,
      type: 'metrics',
      data: metrics,
      timestamp: Date.now()
    });
    
    this.schedulePush();
  }

  /**
   * 调度推送（防抖）
   */
  private schedulePush(): void {
    // 清除之前的定时器
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
    }
    
    // 设置新的定时器
    this.pushTimer = setTimeout(() => {
      this.executePush();
    }, this.debounceMs);
  }

  /**
   * 执行批量推送
   */
  private executePush(): void {
    if (this.pendingPushes.size === 0) {
      return;
    }
    
    const pushCount = this.pendingPushes.size;
    logger.info(`[DataPush] Executing batch push: ${pushCount} updates`);
    
    // 按环境分组推送
    const byEnvironment = new Map<string, PendingPush[]>();
    
    this.pendingPushes.forEach((push) => {
      if (!byEnvironment.has(push.envId)) {
        byEnvironment.set(push.envId, []);
      }
      byEnvironment.get(push.envId)!.push(push);
    });
    
    // 推送每个环境的数据
    byEnvironment.forEach((pushes, envId) => {
      // 检查是否有连接的客户端（全局连接或特定环境连接）
      const totalClients = this.webSocketService.getClientCount();
      if (totalClients === 0) {
        logger.warn(`[DataPush] No clients connected, skipping push for envId=${envId}`);
        return;
      }
      
      logger.info(`[DataPush] Pushing ${pushes.length} updates to ${totalClients} clients for envId=${envId}`);
      
      pushes.forEach((push) => {
        try {
          if (push.type === 'state') {
            this.webSocketService.broadcastStateUpdate(push.envId, push.nodeId, push.data);
          } else if (push.type === 'metrics') {
            this.webSocketService.broadcastMetricsUpdate(push.envId, push.nodeId, push.data);
          }
        } catch (error) {
          logger.error(`Error pushing ${push.type} for node ${push.nodeId}:`, error);
        }
      });
    });
    
    // 清空待推送队列
    this.pendingPushes.clear();
    this.lastPushTime = Date.now();
  }

  /**
   * 启动心跳定时器
   * 长时间无更新时，推送所有节点的最新状态
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastPush = Date.now() - this.lastPushTime;
      
      // 如果距离上次推送超过心跳间隔，执行一次全量推送
      if (timeSinceLastPush >= this.heartbeatIntervalMs) {
        logger.debug('Heartbeat: Pushing all node states');
        this.pushAllNodeStates();
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * 推送所有节点的最新状态（心跳）
   */
  private async pushAllNodeStates(): Promise<void> {
    try {
      // 获取所有环境
      const environments = query(`SELECT id FROM environments`);

      for (const env of environments) {
        const envId = env.id;

        // 检查是否有连接的客户端（全局连接）
        const totalClients = this.webSocketService.getClientCount();
        if (totalClients === 0) {
          continue;
        }

        // 获取该环境的所有节点
        const nodes = query(
          `SELECT id FROM nodes WHERE environment_id = ?`,
          [envId]
        );

        for (const node of nodes) {
          const nodeId = node.id;

          // 查询并推送节点状态
          const stateResults = query(
            `SELECT status, last_check_time, message, metrics
             FROM node_states
             WHERE node_id = ?
             LIMIT 1`,
            [nodeId]
          );

          if (stateResults.length > 0) {
            const state = stateResults[0];
            
            this.webSocketService.broadcastStateUpdate(envId, nodeId, {
              status: state.status,
              lastCheckTime: state.last_check_time ? new Date(state.last_check_time) : new Date(),
              message: state.message || undefined,
              metrics: state.metrics ? JSON.parse(state.metrics) : undefined
            });
          }

          // 查询并推送指标数据
          const metricsResults = query(
            `SELECT data, timestamp
             FROM metrics_data
             WHERE node_id = ?
             ORDER BY timestamp DESC
             LIMIT 1`,
            [nodeId]
          );

          if (metricsResults.length > 0) {
            const row = metricsResults[0];
            
            try {
              const parsedData = JSON.parse(row.data);
              const timestamp = new Date(row.timestamp);
              
              const metrics: any[] = [];
              
              if (Array.isArray(parsedData)) {
                parsedData.forEach(item => {
                  metrics.push({
                    name: item.name,
                    value: item.value,
                    unit: item.unit,
                    timestamp: timestamp,
                    thresholdViolation: item.thresholdViolation
                  });
                });
              } else {
                metrics.push({
                  name: parsedData.name,
                  value: parsedData.value,
                  unit: parsedData.unit,
                  timestamp: timestamp,
                  thresholdViolation: parsedData.thresholdViolation
                });
              }
              
              if (metrics.length > 0) {
                this.webSocketService.broadcastMetricsUpdate(envId, nodeId, metrics);
              }
            } catch (parseError) {
              logger.error(`Error parsing metrics data for ${nodeId}:`, parseError);
            }
          }
        }
      }
      
      this.lastPushTime = Date.now();
    } catch (error) {
      logger.error('Error in heartbeat push:', error);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): { debounceMs: number; heartbeatIntervalMs: number } {
    return {
      debounceMs: this.debounceMs,
      heartbeatIntervalMs: this.heartbeatIntervalMs
    };
  }
}

export default DataPushScheduler;
