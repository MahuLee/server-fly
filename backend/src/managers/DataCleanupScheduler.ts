import * as cron from 'node-cron';
import { query, execute } from '../database/init';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 数据清理调度器
 * 负责定期清理过期的时序数据
 */
export class DataCleanupScheduler {
  private task: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private retentionDays: number;

  constructor() {
    // 从环境变量读取数据保留天数，默认3天
    this.retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '3');
    
    if (this.retentionDays < 1) {
      logger.warn(`Invalid DATA_RETENTION_DAYS value: ${process.env.DATA_RETENTION_DAYS}, using default: 3`);
      this.retentionDays = 3;
    }
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('DataCleanupScheduler is already running');
      return;
    }

    // 每天凌晨 2:00 执行清理任务
    this.task = cron.schedule('0 2 * * *', async () => {
      await this.executeCleanup();
    });

    this.isRunning = true;
    logger.info(`DataCleanupScheduler started (retention: ${this.retentionDays} days, runs daily at 02:00)`);
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    this.isRunning = false;
    logger.info('DataCleanupScheduler stopped');
  }

  /**
   * 执行数据清理
   */
  async executeCleanup(): Promise<void> {
    try {
      logger.info('Starting data cleanup...');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      const cutoffTimestamp = cutoffDate.toISOString();

      logger.info(`Cleaning data older than: ${cutoffDate.toISOString()} (${this.retentionDays} days ago)`);

      // 1. 清理 metrics_data
      const metricsCount = this.getRecordCount('metrics_data', cutoffTimestamp);
      if (metricsCount > 0) {
        execute(
          `DELETE FROM metrics_data WHERE timestamp < ?`,
          [cutoffTimestamp]
        );
        logger.info(`Deleted ${metricsCount} records from metrics_data`);
      } else {
        logger.debug('No old records to delete from metrics_data');
      }

      // 2. 清理 status_history
      const statusCount = this.getRecordCount('status_history', cutoffTimestamp);
      if (statusCount > 0) {
        execute(
          `DELETE FROM status_history WHERE timestamp < ?`,
          [cutoffTimestamp]
        );
        logger.info(`Deleted ${statusCount} records from status_history`);
      } else {
        logger.debug('No old records to delete from status_history');
      }

      // // 3. 清理 node_states（只清理很久没更新的状态）
      // const statesCount = this.getRecordCount('node_states', cutoffTimestamp, 'updated_at');
      // if (statesCount > 0) {
      //   execute(
      //     `DELETE FROM node_states WHERE updated_at < ?`,
      //     [cutoffTimestamp]
      //   );
      //   logger.info(`Deleted ${statesCount} records from node_states`);
      // } else {
      //   logger.debug('No old records to delete from node_states');
      // }

      // 4. 清理 action_logs
      const actionsCount = this.getRecordCount('action_logs', cutoffTimestamp);
      if (actionsCount > 0) {
        execute(
          `DELETE FROM action_logs WHERE timestamp < ?`,
          [cutoffTimestamp]
        );
        logger.info(`Deleted ${actionsCount} records from action_logs`);
      } else {
        logger.debug('No old records to delete from action_logs');
      }

      // const totalDeleted = metricsCount + statusCount + statesCount + actionsCount;
      const totalDeleted = metricsCount + statusCount + actionsCount;
      logger.info(`Data cleanup completed: ${totalDeleted} total records deleted`);
    } catch (error) {
      logger.error('Error during data cleanup:', error);
    }
  }

  /**
   * 获取需要删除的记录数
   */
  private getRecordCount(tableName: string, cutoffTimestamp: string, timestampColumn: string = 'timestamp'): number {
    try {
      const results = query(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE ${timestampColumn} < ?`,
        [cutoffTimestamp]
      );
      return results[0]?.count || 0;
    } catch (error) {
      logger.error(`Error counting records in ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * 手动触发清理（用于测试）
   */
  async manualCleanup(): Promise<void> {
    logger.info('Manual cleanup triggered');
    await this.executeCleanup();
  }

  /**
   * 获取配置信息
   */
  getConfig(): { retentionDays: number; isRunning: boolean } {
    return {
      retentionDays: this.retentionDays,
      isRunning: this.isRunning
    };
  }

  /**
   * 获取各表的数据统计
   */
  getDataStats(): {
    metrics_data: number;
    status_history: number;
    node_states: number;
    action_logs: number;
  } {
    try {
      const metricsCount = query(`SELECT COUNT(*) as count FROM metrics_data`)[0]?.count || 0;
      const statusCount = query(`SELECT COUNT(*) as count FROM status_history`)[0]?.count || 0;
      const statesCount = query(`SELECT COUNT(*) as count FROM node_states`)[0]?.count || 0;
      const actionsCount = query(`SELECT COUNT(*) as count FROM action_logs`)[0]?.count || 0;

      return {
        metrics_data: metricsCount,
        status_history: statusCount,
        node_states: statesCount,
        action_logs: actionsCount
      };
    } catch (error) {
      logger.error('Error getting data stats:', error);
      return {
        metrics_data: 0,
        status_history: 0,
        node_states: 0,
        action_logs: 0
      };
    }
  }
}

export default DataCleanupScheduler;
