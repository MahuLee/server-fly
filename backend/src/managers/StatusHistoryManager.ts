import { StatusHistory } from '../types';
import { query, execute } from '../database/init';

const uuid: any = require('uuid');

/**
 * 状态历史管理器
 * 负责记录和查询节点状态变化历史
 */
export class StatusHistoryManager {
  /**
   * 记录状态变化
   * @param nodeId 节点ID
   * @param status 新状态
   * @param message 状态消息
   * @returns 创建的状态历史记录
   */
  recordStatusChange(
    nodeId: string,
    status: 'running' | 'error' | 'warning' | 'unknown',
    message?: string
  ): StatusHistory {
    const id = uuid.v4();
    const now = new Date();

    try {
      execute(
        `INSERT INTO status_history (id, node_id, status, message, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, nodeId, status, message || null, now.toISOString(), now.toISOString()]
      );

      return {
        id,
        nodeId,
        status,
        message,
        timestamp: now
      };
    } catch (error) {
      throw new Error(`Failed to record status change: ${error}`);
    }
  }

  /**
   * 获取节点的状态历史
   * @param nodeId 节点ID
   * @param limit 返回的最大记录数
   * @returns 状态历史列表
   */
  getStatusHistory(nodeId: string, limit: number = 100): StatusHistory[] {
    try {
      const results = query(
        `SELECT id, node_id, status, message, timestamp FROM status_history
         WHERE node_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [nodeId, limit]
      );

      return results.map(row => ({
        id: row.id,
        nodeId: row.node_id,
        status: row.status as 'running' | 'error' | 'warning' | 'unknown',
        message: row.message,
        timestamp: new Date(row.timestamp)
      }));
    } catch (error) {
      throw new Error(`Failed to get status history: ${error}`);
    }
  }

  /**
   * 获取时间范围内的状态历史
   * @param nodeId 节点ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 状态历史列表
   */
  getStatusHistoryByTimeRange(
    nodeId: string,
    startTime: Date,
    endTime: Date
  ): StatusHistory[] {
    try {
      const results = query(
        `SELECT id, node_id, status, message, timestamp FROM status_history
         WHERE node_id = ? AND timestamp >= ? AND timestamp <= ?
         ORDER BY timestamp DESC`,
        [nodeId, startTime.toISOString(), endTime.toISOString()]
      );

      return results.map(row => ({
        id: row.id,
        nodeId: row.node_id,
        status: row.status as 'running' | 'error' | 'warning' | 'unknown',
        message: row.message,
        timestamp: new Date(row.timestamp)
      }));
    } catch (error) {
      throw new Error(`Failed to get status history by time range: ${error}`);
    }
  }

  /**
   * 获取节点的最新状态
   * @param nodeId 节点ID
   * @returns 最新的状态历史记录，如果没有则返回null
   */
  getLatestStatus(nodeId: string): StatusHistory | null {
    try {
      const results = query(
        `SELECT id, node_id, status, message, timestamp FROM status_history
         WHERE node_id = ?
         ORDER BY timestamp DESC
         LIMIT 1`,
        [nodeId]
      );

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.id,
        nodeId: row.node_id,
        status: row.status as 'running' | 'error' | 'warning' | 'unknown',
        message: row.message,
        timestamp: new Date(row.timestamp)
      };
    } catch (error) {
      throw new Error(`Failed to get latest status: ${error}`);
    }
  }

  /**
   * 获取节点的状态变化统计
   * @param nodeId 节点ID
   * @param timeRange 时间范围（秒）
   * @returns 状态变化统计
   */
  getStatusChangeStats(nodeId: string, timeRange: number = 3600): {
    totalChanges: number;
    healthyCount: number;
    unhealthyCount: number;
    warningCount: number;
    unknownCount: number;
  } {
    try {
      const cutoffTime = new Date(Date.now() - timeRange * 1000);

      const results = query(
        `SELECT status, COUNT(*) as count FROM status_history
         WHERE node_id = ? AND timestamp >= ?
         GROUP BY status`,
        [nodeId, cutoffTime.toISOString()]
      );

      const stats = {
        totalChanges: 0,
        healthyCount: 0,
        unhealthyCount: 0,
        warningCount: 0,
        unknownCount: 0
      };

      results.forEach(row => {
        const count = row.count;
        stats.totalChanges += count;

        switch (row.status) {
          case 'healthy':
            stats.healthyCount = count;
            break;
          case 'unhealthy':
            stats.unhealthyCount = count;
            break;
          case 'warning':
            stats.warningCount = count;
            break;
          case 'unknown':
            stats.unknownCount = count;
            break;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get status change stats: ${error}`);
    }
  }

  /**
   * 清理旧的状态历史记录
   * @param nodeId 节点ID
   * @param daysToKeep 保留的天数
   */
  cleanupOldHistory(nodeId: string, daysToKeep: number = 30): number {
    try {
      const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const results = query(
        `SELECT COUNT(*) as count FROM status_history
         WHERE node_id = ? AND timestamp < ?`,
        [nodeId, cutoffTime.toISOString()]
      );

      const countToDelete = results[0]?.count || 0;

      execute(
        `DELETE FROM status_history WHERE node_id = ? AND timestamp < ?`,
        [nodeId, cutoffTime.toISOString()]
      );

      return countToDelete;
    } catch (error) {
      throw new Error(`Failed to cleanup old history: ${error}`);
    }
  }

  /**
   * 删除节点的所有状态历史
   * @param nodeId 节点ID
   */
  deleteNodeHistory(nodeId: string): void {
    try {
      execute(`DELETE FROM status_history WHERE node_id = ?`, [nodeId]);
    } catch (error) {
      throw new Error(`Failed to delete node history: ${error}`);
    }
  }
}

export default StatusHistoryManager;
