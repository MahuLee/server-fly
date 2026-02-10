import { DataCollector } from '../DataCollector';
import { MetricsConfig, MetricData } from '../../types';
import { initializeDatabase, closeDatabase, query, execute } from '../../database/init';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const uuid: any = require('uuid');

describe('DataCollector', () => {
  let dataCollector: DataCollector;
  let testNodeId: string;

  beforeAll(async () => {
    await initializeDatabase();
  });

  beforeEach(() => {
    dataCollector = new DataCollector();
    testNodeId = uuid.v4();

    // 创建测试节点
    const envId = uuid.v4();
    execute(
      `INSERT INTO environments (id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [envId, 'Test Env', 'Test Description', new Date().toISOString(), new Date().toISOString()]
    );

    execute(
      `INSERT INTO nodes (id, environment_id, type, label, x, y, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [testNodeId, envId, 'service', 'Test Node', 100, 100, new Date().toISOString(), new Date().toISOString()]
    );
  });

  afterEach(() => {
    // 清理测试数据
    execute(`DELETE FROM metrics_data WHERE node_id = ?`, [testNodeId]);
    execute(`DELETE FROM nodes WHERE id = ?`, [testNodeId]);
    execute(`DELETE FROM environments`);
    jest.clearAllMocks();
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('collectMetrics', () => {
    it('应该成功收集指标数据', async () => {
      const metricsConfig: MetricsConfig = {
        endpoint: 'http://example.com/metrics',
        interval: 60,
        metrics: [
          {
            name: 'cpu_usage',
            path: 'cpu.usage',
            unit: '%',
            threshold: {
              warning: 70,
              critical: 90,
              operator: '>'
            }
          },
          {
            name: 'memory_used',
            path: 'memory.used',
            unit: 'MB'
          }
        ]
      };

      // Mock axios 响应
      mockedAxios.get.mockResolvedValue({
        data: {
          cpu: { usage: 45 },
          memory: { used: 2048 }
        }
      });

      const result = await dataCollector.collectMetrics(testNodeId, metricsConfig);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'cpu_usage',
        value: 45,
        unit: '%',
        thresholdViolation: undefined
      });
      expect(result[1]).toMatchObject({
        name: 'memory_used',
        value: 2048,
        unit: 'MB',
        thresholdViolation: undefined
      });

      // 验证数据已保存到数据库
      const savedMetrics = query(
        `SELECT * FROM metrics_data WHERE node_id = ?`,
        [testNodeId]
      );
      expect(savedMetrics).toHaveLength(2);
    });

    it('应该检测到警告级别的阈值违规', async () => {
      const metricsConfig: MetricsConfig = {
        endpoint: 'http://example.com/metrics',
        interval: 60,
        metrics: [
          {
            name: 'cpu_usage',
            path: 'cpu.usage',
            unit: '%',
            threshold: {
              warning: 70,
              critical: 90,
              operator: '>'
            }
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          cpu: { usage: 75 }
        }
      });

      const result = await dataCollector.collectMetrics(testNodeId, metricsConfig);

      expect(result[0].thresholdViolation).toBe('warning');
    });

    it('应该检测到严重级别的阈值违规', async () => {
      const metricsConfig: MetricsConfig = {
        endpoint: 'http://example.com/metrics',
        interval: 60,
        metrics: [
          {
            name: 'cpu_usage',
            path: 'cpu.usage',
            unit: '%',
            threshold: {
              warning: 70,
              critical: 90,
              operator: '>'
            }
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          cpu: { usage: 95 }
        }
      });

      const result = await dataCollector.collectMetrics(testNodeId, metricsConfig);

      expect(result[0].thresholdViolation).toBe('critical');
    });

    it('应该处理不同的阈值操作符', async () => {
      const metricsConfig: MetricsConfig = {
        endpoint: 'http://example.com/metrics',
        interval: 60,
        metrics: [
          {
            name: 'disk_free',
            path: 'disk.free',
            unit: 'GB',
            threshold: {
              warning: 20,
              critical: 10,
              operator: '<'
            }
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          disk: { free: 15 }
        }
      });

      const result = await dataCollector.collectMetrics(testNodeId, metricsConfig);

      expect(result[0].thresholdViolation).toBe('warning');
    });

    it('应该处理嵌套路径', async () => {
      const metricsConfig: MetricsConfig = {
        endpoint: 'http://example.com/metrics',
        interval: 60,
        metrics: [
          {
            name: 'response_time',
            path: 'api.endpoints.users.avg_response_time',
            unit: 'ms'
          }
        ]
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          api: {
            endpoints: {
              users: {
                avg_response_time: 125
              }
            }
          }
        }
      });

      const result = await dataCollector.collectMetrics(testNodeId, metricsConfig);

      expect(result[0]).toMatchObject({
        name: 'response_time',
        value: 125,
        unit: 'ms'
      });
    });

    it('应该在请求失败时抛出错误', async () => {
      const metricsConfig: MetricsConfig = {
        endpoint: 'http://example.com/metrics',
        interval: 60,
        metrics: [
          {
            name: 'cpu_usage',
            path: 'cpu.usage',
            unit: '%'
          }
        ]
      };

      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(
        dataCollector.collectMetrics(testNodeId, metricsConfig)
      ).rejects.toThrow('Failed to collect metrics');
    });
  });

  describe('getMetricsHistory', () => {
    beforeEach(() => {
      // 插入测试数据
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(now.getTime() - i * 60000); // 每分钟一条
        execute(
          `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuid.v4(), testNodeId, 'cpu_usage', 50 + i, '%', timestamp.toISOString(), now.toISOString()]
        );
      }
    });

    it('应该返回指定数量的历史记录', () => {
      const history = dataCollector.getMetricsHistory(testNodeId, undefined, 3);

      expect(history).toHaveLength(3);
      expect(history[0].name).toBe('cpu_usage');
    });

    it('应该按时间戳降序排列', () => {
      const history = dataCollector.getMetricsHistory(testNodeId);

      expect(history.length).toBeGreaterThan(1);
      for (let i = 1; i < history.length; i++) {
        expect(history[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i].timestamp.getTime()
        );
      }
    });

    it('应该能够按指标名称过滤', () => {
      // 添加不同名称的指标
      execute(
        `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid.v4(), testNodeId, 'memory_used', 2048, 'MB', new Date().toISOString(), new Date().toISOString()]
      );

      const history = dataCollector.getMetricsHistory(testNodeId, 'cpu_usage');

      expect(history.every(m => m.name === 'cpu_usage')).toBe(true);
    });
  });

  describe('getMetricsByTimeRange', () => {
    beforeEach(() => {
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - i * 3600000); // 每小时一条
        execute(
          `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuid.v4(), testNodeId, 'cpu_usage', 50 + i, '%', timestamp.toISOString(), now.toISOString()]
        );
      }
    });

    it('应该返回时间范围内的数据', () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 5 * 3600000); // 5小时前
      const endTime = now;

      const metrics = dataCollector.getMetricsByTimeRange(testNodeId, startTime, endTime);

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.length).toBeLessThanOrEqual(6); // 应该包含0-5小时的数据
    });

    it('应该能够按指标名称过滤时间范围查询', () => {
      const now = new Date();
      execute(
        `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid.v4(), testNodeId, 'memory_used', 2048, 'MB', now.toISOString(), now.toISOString()]
      );

      const startTime = new Date(now.getTime() - 3600000);
      const endTime = new Date(now.getTime() + 3600000);

      const metrics = dataCollector.getMetricsByTimeRange(
        testNodeId,
        startTime,
        endTime,
        'memory_used'
      );

      expect(metrics.every(m => m.name === 'memory_used')).toBe(true);
    });
  });

  describe('getLatestMetrics', () => {
    it('应该返回每个指标的最新值', () => {
      const now = new Date();

      // 插入多个指标的多条数据
      execute(
        `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid.v4(), testNodeId, 'cpu_usage', 50, '%', new Date(now.getTime() - 60000).toISOString(), now.toISOString()]
      );
      execute(
        `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid.v4(), testNodeId, 'cpu_usage', 60, '%', now.toISOString(), now.toISOString()]
      );
      execute(
        `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid.v4(), testNodeId, 'memory_used', 2048, 'MB', now.toISOString(), now.toISOString()]
      );

      const latest = dataCollector.getLatestMetrics(testNodeId);

      expect(latest).toHaveLength(2);
      const cpuMetric = latest.find(m => m.name === 'cpu_usage');
      expect(cpuMetric?.value).toBe(60); // 应该是最新的值
    });

    it('应该在没有数据时返回空数组', () => {
      const latest = dataCollector.getLatestMetrics(testNodeId);

      expect(latest).toEqual([]);
    });
  });

  describe('cleanupOldMetrics', () => {
    it('应该删除旧的指标数据', () => {
      const now = new Date();
      const oldTimestamp = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40天前

      // 插入旧数据
      execute(
        `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid.v4(), testNodeId, 'cpu_usage', 50, '%', oldTimestamp.toISOString(), now.toISOString()]
      );

      // 插入新数据
      execute(
        `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid.v4(), testNodeId, 'cpu_usage', 60, '%', now.toISOString(), now.toISOString()]
      );

      const deletedCount = dataCollector.cleanupOldMetrics(testNodeId, 30);

      expect(deletedCount).toBe(1);

      const remaining = query(
        `SELECT * FROM metrics_data WHERE node_id = ?`,
        [testNodeId]
      );
      expect(remaining).toHaveLength(1);
    });
  });

  describe('deleteNodeMetrics', () => {
    it('应该删除节点的所有指标数据', () => {
      // 插入测试数据
      execute(
        `INSERT INTO metrics_data (id, node_id, name, value, unit, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid.v4(), testNodeId, 'cpu_usage', 50, '%', new Date().toISOString(), new Date().toISOString()]
      );

      dataCollector.deleteNodeMetrics(testNodeId);

      const remaining = query(
        `SELECT * FROM metrics_data WHERE node_id = ?`,
        [testNodeId]
      );
      expect(remaining).toHaveLength(0);
    });
  });
});
