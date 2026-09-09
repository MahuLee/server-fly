import * as cron from 'node-cron';
import { MetricsConfig, MetricData } from '../types';
import { query } from '../database/init';
import { logger } from '../utils/logger';
import { DataCollector } from './DataCollector';

/**
 * 监控指标调度器
 * 负责定时执行指标采集任务（Pull模式）
 */
export class MetricsScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;
  private callbacks: Map<string, (nodeId: string, metrics: MetricData[]) => void> = new Map();
  private dataCollector: DataCollector;

  constructor(dataCollector: DataCollector) {
    this.dataCollector = dataCollector;
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('MetricsScheduler is already running');
      return;
    }
    this.isRunning = true;
    logger.info('MetricsScheduler started');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    // 停止所有任务
    this.tasks.forEach((task) => {
      task.stop();
    });
    this.tasks.clear();
    this.isRunning = false;
    logger.info('MetricsScheduler stopped');
  }

  /**
   * 注册指标采集任务
   * @param nodeId 节点ID
   * @param config 监控指标配置
   */
  registerMetricsCollection(nodeId: string, config: MetricsConfig): void {
    if (!this.isRunning) {
      logger.warn('MetricsScheduler is not running');
      return;
    }

    // 只处理 Pull 模式
    if (config.collectionMode !== 'pull') {
      logger.debug(`Node ${nodeId} is not in pull mode, skipping registration`);
      return;
    }

    // 验证必填字段
    if (!config.endpoint || !config.interval) {
      logger.warn(`Node ${nodeId} missing required fields (endpoint or interval)`);
      return;
    }

    // 如果已存在该节点的任务，先取消
    if (this.tasks.has(nodeId)) {
      this.unregisterMetricsCollection(nodeId);
    }

    // 创建cron表达式（根据interval转换为cron格式）
    const cronExpression = this.intervalToCron(config.interval);

    // 创建定时任务
    const task = cron.schedule(cronExpression, async () => {
      try {
        const metrics = await this.collectMetrics(nodeId);
        this.notifyCollectionComplete(nodeId, metrics);
      } catch (error) {
        logger.error(`Metrics collection failed for node ${nodeId}:`, error);
      }
    });

    this.tasks.set(nodeId, task);
    logger.info(`Metrics collection registered for node ${nodeId} with interval ${config.interval}s`);
  }

  /**
   * 取消指标采集任务
   * @param nodeId 节点ID
   */
  unregisterMetricsCollection(nodeId: string): void {
    const task = this.tasks.get(nodeId);
    if (task) {
      task.stop();
      this.tasks.delete(nodeId);
      logger.info(`Metrics collection unregistered for node ${nodeId}`);
    }
  }

  /**
   * 执行单次指标采集
   * @param nodeId 节点ID
   * @returns 采集到的指标数据
   */
  async collectMetrics(nodeId: string): Promise<MetricData[]> {
    try {
      // 从数据库获取节点配置
      const nodeResults = query(
        `SELECT metrics FROM node_properties WHERE node_id = ?`,
        [nodeId]
      );

      if (nodeResults.length === 0) {
        throw new Error(`Node ${nodeId} not found`);
      }

      const metricsConfig: MetricsConfig = nodeResults[0].metrics ? JSON.parse(nodeResults[0].metrics) : null;

      if (!metricsConfig) {
        throw new Error(`No metrics config found for node ${nodeId}`);
      }

      // 应用默认值
      const config = {
        ...metricsConfig,
        timeout: metricsConfig.timeout || 5
      };

      // 调用 DataCollector 收集指标
      const metrics = await this.dataCollector.collectMetrics(nodeId, config);

      logger.info(`Collected ${metrics.length} metrics for node ${nodeId}`);
      return metrics;
    } catch (error: any) {
      logger.error(`Failed to collect metrics for node ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * 注册采集完成回调
   * @param callback 回调函数
   */
  onCollectionComplete(callback: (nodeId: string, metrics: MetricData[]) => void): void {
    const callbackId = `callback_${Date.now()}`;
    this.callbacks.set(callbackId, callback);
  }

  /**
   * 通知所有回调函数采集完成
   * @param nodeId 节点ID
   * @param metrics 指标数据
   */
  private notifyCollectionComplete(nodeId: string, metrics: MetricData[]): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(nodeId, metrics);
      } catch (error) {
        logger.error('Error in metrics collection callback:', error);
      }
    });
  }

  /**
   * 将间隔秒数转换为cron表达式
   * @param intervalSeconds 间隔秒数
   * @returns cron表达式
   */
  private intervalToCron(intervalSeconds: number): string {
    // 如果间隔小于60秒，使用*/N秒的格式
    if (intervalSeconds < 60) {
      return `*/${intervalSeconds} * * * * *`;
    }

    // 如果间隔是分钟的倍数
    const minutes = Math.floor(intervalSeconds / 60);
    if (intervalSeconds % 60 === 0 && minutes <= 59) {
      return `*/${minutes} * * * *`;
    }

    // 默认每分钟检查一次
    return '* * * * *';
  }

  /**
   * 获取当前任务数量
   */
  getTaskCount(): number {
    return this.tasks.size;
  }

  /**
   * 检查节点是否已注册
   */
  isRegistered(nodeId: string): boolean {
    return this.tasks.has(nodeId);
  }
}

export default MetricsScheduler;
