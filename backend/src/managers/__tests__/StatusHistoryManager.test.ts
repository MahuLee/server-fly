import { StatusHistoryManager } from '../StatusHistoryManager';
import { initializeDatabase, closeDatabase, query, execute } from '../../database/init';

describe('StatusHistoryManager', () => {
  let manager: StatusHistoryManager;
  let testNodeId: string;

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    manager = new StatusHistoryManager();
    testNodeId = 'test-node-' + Date.now();

    // 创建测试节点
    execute(
      `INSERT INTO nodes (id, environment_id, type, label, x, y, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [testNodeId, 'test-env', 'service', 'Test Node', 0, 0, new Date().toISOString(), new Date().toISOString()]
    );
  });

  afterEach(() => {
    // 清理测试数据
    execute(`DELETE FROM status_history WHERE node_id = ?`, [testNodeId]);
    execute(`DELETE FROM nodes WHERE id = ?`, [testNodeId]);
  });

  describe('recordStatusChange', () => {
    it('should record a status change', () => {
      const result = manager.recordStatusChange(testNodeId, 'healthy', 'Service is running');

      expect(result).toBeDefined();
      expect(result.nodeId).toBe(testNodeId);
      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Service is running');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should record status change without message', () => {
      const result = manager.recordStatusChange(testNodeId, 'unhealthy');

      expect(result).toBeDefined();
      expect(result.nodeId).toBe(testNodeId);
      expect(result.status).toBe('unhealthy');
      expect(result.message).toBeUndefined();
    });

    it('should record multiple status changes', () => {
      manager.recordStatusChange(testNodeId, 'healthy');
      manager.recordStatusChange(testNodeId, 'warning');
      manager.recordStatusChange(testNodeId, 'unhealthy');

      const history = manager.getStatusHistory(testNodeId);
      expect(history.length).toBe(3);
    });
  });

  describe('getStatusHistory', () => {
    it('should retrieve status history', () => {
      manager.recordStatusChange(testNodeId, 'healthy');
      manager.recordStatusChange(testNodeId, 'warning');

      const history = manager.getStatusHistory(testNodeId);

      expect(history.length).toBe(2);
      expect(history[0].status).toBe('warning'); // Most recent first
      expect(history[1].status).toBe('healthy');
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        manager.recordStatusChange(testNodeId, 'healthy');
      }

      const history = manager.getStatusHistory(testNodeId, 5);
      expect(history.length).toBe(5);
    });

    it('should return empty array for non-existent node', () => {
      const history = manager.getStatusHistory('non-existent-node');
      expect(history.length).toBe(0);
    });
  });

  describe('getLatestStatus', () => {
    it('should get the latest status', () => {
      manager.recordStatusChange(testNodeId, 'healthy');
      manager.recordStatusChange(testNodeId, 'warning');
      manager.recordStatusChange(testNodeId, 'unhealthy');

      const latest = manager.getLatestStatus(testNodeId);

      expect(latest).toBeDefined();
      expect(latest?.status).toBe('unhealthy');
    });

    it('should return null for non-existent node', () => {
      const latest = manager.getLatestStatus('non-existent-node');
      expect(latest).toBeNull();
    });
  });

  describe('getStatusChangeStats', () => {
    it('should calculate status change statistics', () => {
      manager.recordStatusChange(testNodeId, 'healthy');
      manager.recordStatusChange(testNodeId, 'healthy');
      manager.recordStatusChange(testNodeId, 'warning');
      manager.recordStatusChange(testNodeId, 'unhealthy');

      const stats = manager.getStatusChangeStats(testNodeId, 3600);

      expect(stats.totalChanges).toBe(4);
      expect(stats.healthyCount).toBe(2);
      expect(stats.warningCount).toBe(1);
      expect(stats.unhealthyCount).toBe(1);
      expect(stats.unknownCount).toBe(0);
    });

    it('should respect time range in statistics', () => {
      manager.recordStatusChange(testNodeId, 'healthy');

      // 获取最近1秒的统计
      const stats = manager.getStatusChangeStats(testNodeId, 1);

      expect(stats.totalChanges).toBe(1);
    });
  });

  describe('cleanupOldHistory', () => {
    it('should delete old history records', () => {
      manager.recordStatusChange(testNodeId, 'healthy');

      // 清理0天前的记录（应该删除所有记录）
      const deleted = manager.cleanupOldHistory(testNodeId, 0);

      expect(deleted).toBeGreaterThan(0);

      const history = manager.getStatusHistory(testNodeId);
      expect(history.length).toBe(0);
    });
  });

  describe('deleteNodeHistory', () => {
    it('should delete all history for a node', () => {
      manager.recordStatusChange(testNodeId, 'healthy');
      manager.recordStatusChange(testNodeId, 'warning');

      manager.deleteNodeHistory(testNodeId);

      const history = manager.getStatusHistory(testNodeId);
      expect(history.length).toBe(0);
    });
  });
});
