import { MetricData, MetricsConfig, ThresholdConfig } from '../types';
import { query, execute } from '../database/init';
import { logger } from '../utils/logger';
import axios from 'axios';

const uuid: any = require('uuid');

/**
 * 数据收集器
 * 负责收集节点的监控指标数据并检查阈值
 */
export class DataCollector {
  /**
   * 从节点收集指标数据
   * @param nodeId 节点ID
   * @param metricsConfig 监控指标配置
   * @returns 收集到的指标数据数组
   */
  async collectMetrics(
    nodeId: string,
    metricsConfig: MetricsConfig
  ): Promise<MetricData[]> {
    try {
      // 如果没有配置 endpoint，直接返回空数组（不进行采集）
      if (!metricsConfig.endpoint) {
        logger.debug(`No endpoint configured for node ${nodeId}, skipping metrics collection`);
        return [];
      }

      // 从端点获取指标数据
      const response = await axios.get(metricsConfig.endpoint, {
        timeout: (metricsConfig.timeout || 5) * 1000
      });

      const metricsData: MetricData[] = [];
      const timestamp = new Date();

      // 处理每个配置的指标
      for (const metricDef of metricsConfig.metrics) {
        // 从响应中提取指标值（使用路径）
        const value = this.extractValueByPath(response.data, metricDef.path);

        if (value !== undefined && value !== null) {
          // 检查阈值
          const thresholdViolation = metricDef.threshold
            ? this.checkThreshold(value, metricDef.threshold)
            : undefined;

          const metricData: MetricData = {
            name: metricDef.name,
            value: Number(value),
            unit: metricDef.unit,
            timestamp,
            thresholdViolation
          };

          metricsData.push(metricData);
        }
      }

      // 保存所有指标到数据库（作为一条记录）
      if (metricsData.length > 0) {
        this.saveMetricsData(nodeId, metricsData, timestamp);
      }

      return metricsData;
    } catch (error: any) {
      throw new Error(`Failed to collect metrics: ${error.message}`);
    }
  }

  /**
   * 从对象中按路径提取值
   * @param obj 对象
   * @param path 路径（例如 "cpu.usage" 或 "memory.used"）
   * @returns 提取的值
   */
  private extractValueByPath(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 检查指标值是否违反阈值
   * @param value 指标值
   * @param threshold 阈值配置
   * @returns 违规级别（'warning' | 'critical'）或 undefined
   */
  private checkThreshold(
    value: number,
    threshold: ThresholdConfig
  ): 'warning' | 'critical' | undefined {
    const { warning, critical, operator } = threshold;

    let violatesWarning = false;
    let violatesCritical = false;

    switch (operator) {
      case '>':
        violatesWarning = value > warning;
        violatesCritical = value > critical;
        break;
      case '<':
        violatesWarning = value < warning;
        violatesCritical = value < critical;
        break;
      case '>=':
        violatesWarning = value >= warning;
        violatesCritical = value >= critical;
        break;
      case '<=':
        violatesWarning = value <= warning;
        violatesCritical = value <= critical;
        break;
      case '==':
        violatesWarning = value === warning;
        violatesCritical = value === critical;
        break;
    }

    if (violatesCritical) {
      return 'critical';
    } else if (violatesWarning) {
      return 'warning';
    }

    return undefined;
  }

  /**
   * 保存指标数据到数据库
   * @param nodeId 节点ID
   * @param metricsData 指标数据数组
   * @param timestamp 时间戳
   */
  private saveMetricsData(nodeId: string, metricsData: MetricData[], timestamp: Date): void {
    const id = uuid.v4();
    const now = new Date();

    // 将所有指标数据序列化为 JSON 数组
    const jsonData = JSON.stringify(metricsData.map(metric => ({
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      thresholdViolation: metric.thresholdViolation
    })));

    execute(
      `INSERT INTO metrics_data (id, node_id, data, timestamp, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        nodeId,
        jsonData,
        timestamp.toISOString(),
        now.toISOString()
      ]
    );
  }

  /**
   * 查询节点的指标数据历史
   * @param nodeId 节点ID
   * @param metricName 指标名称（可选）
   * @param limit 返回的最大记录数
   * @returns 指标数据数组
   */
  getMetricsHistory(
    nodeId: string,
    metricName?: string,
    limit: number = 100
  ): MetricData[] {
    try {
      let sql = `SELECT data, timestamp
                 FROM metrics_data
                 WHERE node_id = ?`;
      const params: any[] = [nodeId];

      sql += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const results = query(sql, params);

      return results
        .map(row => {
          try {
            const parsedData = JSON.parse(row.data);
            return {
              name: parsedData.name,
              value: parsedData.value,
              unit: parsedData.unit,
              timestamp: new Date(row.timestamp),
              thresholdViolation: parsedData.thresholdViolation as 'warning' | 'critical' | undefined
            };
          } catch (error) {
            logger.error('Failed to parse metric data:', error);
            return null;
          }
        })
        .filter(item => item !== null)
        .filter(item => !metricName || item!.name === metricName) as MetricData[];
    } catch (error) {
      throw new Error(`Failed to get metrics history: ${error}`);
    }
  }

  /**
   * 查询时间范围内的指标数据
   * @param nodeId 节点ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param metricName 指标名称（可选）
   * @returns 指标数据数组
   */
  getMetricsByTimeRange(
    nodeId: string,
    startTime: Date,
    endTime: Date,
    metricName?: string
  ): MetricData[] {
    try {
      let sql = `SELECT data, timestamp
                 FROM metrics_data
                 WHERE node_id = ? AND timestamp >= ? AND timestamp <= ?`;
      const params: any[] = [nodeId, startTime.toISOString(), endTime.toISOString()];

      sql += ` ORDER BY timestamp DESC`;

      const results = query(sql, params);

      return results
        .map(row => {
          try {
            const parsedData = JSON.parse(row.data);
            return {
              name: parsedData.name,
              value: parsedData.value,
              unit: parsedData.unit,
              timestamp: new Date(row.timestamp),
              thresholdViolation: parsedData.thresholdViolation as 'warning' | 'critical' | undefined
            };
          } catch (error) {
            console.error('Failed to parse metric data:', error);
            return null;
          }
        })
        .filter(item => item !== null)
        .filter(item => !metricName || item!.name === metricName) as MetricData[];
    } catch (error) {
      throw new Error(`Failed to get metrics by time range: ${error}`);
    }
  }

  /**
   * 获取节点的最新指标数据
   * @param nodeId 节点ID
   * @returns 最新的指标数据数组（每个指标名称一条）
   */
  getLatestMetrics(nodeId: string): MetricData[] {
    try {
      // 获取最新的一条记录
      const results = query(
        `SELECT data, timestamp
         FROM metrics_data
         WHERE node_id = ?
         ORDER BY timestamp DESC
         LIMIT 1`,
        [nodeId]
      );

      if (results.length === 0) {
        return [];
      }

      const row = results[0];
      try {
        const parsedData = JSON.parse(row.data);
        
        // 如果 data 是数组（包含多个指标），返回数组
        if (Array.isArray(parsedData)) {
          return parsedData.map(item => ({
            name: item.name,
            value: item.value,
            unit: item.unit,
            timestamp: new Date(row.timestamp),
            thresholdViolation: item.thresholdViolation as 'warning' | 'critical' | undefined
          }));
        }
        
        // 如果是单个指标对象，返回单元素数组
        return [{
          name: parsedData.name,
          value: parsedData.value,
          unit: parsedData.unit,
          timestamp: new Date(row.timestamp),
          thresholdViolation: parsedData.thresholdViolation as 'warning' | 'critical' | undefined
        }];
      } catch (error) {
        logger.error('Failed to parse metric data:', error);
        return [];
      }
    } catch (error) {
      throw new Error(`Failed to get latest metrics: ${error}`);
    }
  }

  /**
   * 清理旧的指标数据
   * @param nodeId 节点ID
   * @param daysToKeep 保留的天数
   * @returns 删除的记录数
   */
  cleanupOldMetrics(nodeId: string, daysToKeep: number = 30): number {
    try {
      const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const results = query(
        `SELECT COUNT(*) as count FROM metrics_data
         WHERE node_id = ? AND timestamp < ?`,
        [nodeId, cutoffTime.toISOString()]
      );

      const countToDelete = results[0]?.count || 0;

      execute(
        `DELETE FROM metrics_data WHERE node_id = ? AND timestamp < ?`,
        [nodeId, cutoffTime.toISOString()]
      );

      return countToDelete;
    } catch (error) {
      throw new Error(`Failed to cleanup old metrics: ${error}`);
    }
  }

  /**
   * 删除节点的所有指标数据
   * @param nodeId 节点ID
   */
  deleteNodeMetrics(nodeId: string): void {
    try {
      execute(`DELETE FROM metrics_data WHERE node_id = ?`, [nodeId]);
    } catch (error) {
      throw new Error(`Failed to delete node metrics: ${error}`);
    }
  }
}

export default DataCollector;
