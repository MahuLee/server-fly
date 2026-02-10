import { ActionExecutor } from '../ActionExecutor';
import { initializeDatabase } from '../../database/init';
import { Database } from 'sql.js';
import { ActionConfig } from '../../types';

describe('ActionExecutor', () => {
  let db: Database;
  let actionExecutor: ActionExecutor;

  beforeAll(async () => {
    db = await initializeDatabase();
    actionExecutor = new ActionExecutor(db);
  });

  beforeEach(() => {
    // 清理测试数据
    db.run('DELETE FROM action_logs');
  });

  afterAll(() => {
    db.close();
  });

  describe('executeAction', () => {
    it('should execute HTTP action successfully', async () => {
      const config: ActionConfig = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'http',
        endpoint: 'https://httpbin.org/post',
        method: 'POST',
        requireConfirmation: true
      };

      const result = await actionExecutor.executeAction('node-1', 'restart', config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('HTTP POST request completed');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle HTTP action failure', async () => {
      const config: ActionConfig = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'http',
        endpoint: 'https://invalid-url-that-does-not-exist-12345.com',
        method: 'POST',
        requireConfirmation: true
      };

      const result = await actionExecutor.executeAction('node-1', 'restart', config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Action execution failed');
    });

    it('should execute SSH action (simulated)', async () => {
      const config: ActionConfig = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'ssh',
        host: 'server.example.com',
        command: 'systemctl restart myservice',
        requireConfirmation: true
      };

      const result = await actionExecutor.executeAction('node-1', 'restart', config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('SSH command executed');
      expect(result.output).toContain('systemctl restart myservice');
    });

    it('should execute script action (simulated)', async () => {
      const config: ActionConfig = {
        name: 'backup',
        displayName: 'Backup Data',
        type: 'script',
        command: '/scripts/backup.sh',
        requireConfirmation: false
      };

      const result = await actionExecutor.executeAction('node-1', 'backup', config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Script executed successfully');
      expect(result.output).toContain('/scripts/backup.sh');
    });

    it('should reject HTTP action without endpoint', async () => {
      const config: ActionConfig = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'http',
        requireConfirmation: true
      };

      const result = await actionExecutor.executeAction('node-1', 'restart', config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('HTTP endpoint is required');
    });

    it('should reject SSH action without host or command', async () => {
      const config: ActionConfig = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'ssh',
        requireConfirmation: true
      };

      const result = await actionExecutor.executeAction('node-1', 'restart', config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('SSH host and command are required');
    });

    it('should reject script action without command', async () => {
      const config: ActionConfig = {
        name: 'backup',
        displayName: 'Backup Data',
        type: 'script',
        requireConfirmation: false
      };

      const result = await actionExecutor.executeAction('node-1', 'backup', config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Script command is required');
    });
  });

  describe('logAction', () => {
    it('should log action execution', async () => {
      const result = {
        success: true,
        message: 'Action completed',
        output: 'Output data',
        timestamp: new Date()
      };

      await actionExecutor.logAction('node-1', 'restart', result);

      const logs = actionExecutor.getActionHistory('node-1');
      expect(logs).toHaveLength(1);
      expect(logs[0].nodeId).toBe('node-1');
      expect(logs[0].action).toBe('restart');
      expect(logs[0].result.success).toBe(true);
      expect(logs[0].result.message).toBe('Action completed');
    });

    it('should log failed action execution', async () => {
      const result = {
        success: false,
        message: 'Action failed',
        timestamp: new Date()
      };

      await actionExecutor.logAction('node-1', 'restart', result);

      const logs = actionExecutor.getActionHistory('node-1');
      expect(logs).toHaveLength(1);
      expect(logs[0].result.success).toBe(false);
      expect(logs[0].result.message).toBe('Action failed');
    });
  });

  describe('getActionHistory', () => {
    beforeEach(async () => {
      // 添加测试数据
      const result1 = {
        success: true,
        message: 'Restart completed',
        timestamp: new Date('2024-01-01T10:00:00Z')
      };
      const result2 = {
        success: true,
        message: 'Stop completed',
        timestamp: new Date('2024-01-01T11:00:00Z')
      };
      const result3 = {
        success: false,
        message: 'Start failed',
        timestamp: new Date('2024-01-01T12:00:00Z')
      };

      await actionExecutor.logAction('node-1', 'restart', result1);
      await actionExecutor.logAction('node-1', 'stop', result2);
      await actionExecutor.logAction('node-1', 'start', result3);
    });

    it('should retrieve action history for a node', () => {
      const logs = actionExecutor.getActionHistory('node-1');

      expect(logs).toHaveLength(3);
      // 应该按时间倒序排列
      expect(logs[0].action).toBe('start');
      expect(logs[1].action).toBe('stop');
      expect(logs[2].action).toBe('restart');
    });

    it('should limit action history results', () => {
      const logs = actionExecutor.getActionHistory('node-1', 2);

      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('start');
      expect(logs[1].action).toBe('stop');
    });

    it('should return empty array for node with no history', () => {
      const logs = actionExecutor.getActionHistory('node-999');

      expect(logs).toHaveLength(0);
    });
  });

  describe('getAllActionHistory', () => {
    beforeEach(async () => {
      const result1 = {
        success: true,
        message: 'Action 1',
        timestamp: new Date()
      };
      const result2 = {
        success: true,
        message: 'Action 2',
        timestamp: new Date()
      };

      await actionExecutor.logAction('node-1', 'restart', result1);
      await actionExecutor.logAction('node-2', 'stop', result2);
    });

    it('should retrieve all action history', () => {
      const logs = actionExecutor.getAllActionHistory();

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some(log => log.nodeId === 'node-1')).toBe(true);
      expect(logs.some(log => log.nodeId === 'node-2')).toBe(true);
    });

    it('should limit all action history results', () => {
      const logs = actionExecutor.getAllActionHistory(1);

      expect(logs).toHaveLength(1);
    });
  });

  describe('deleteNodeActionLogs', () => {
    beforeEach(async () => {
      const result = {
        success: true,
        message: 'Action completed',
        timestamp: new Date()
      };

      await actionExecutor.logAction('node-1', 'restart', result);
      await actionExecutor.logAction('node-2', 'stop', result);
    });

    it('should delete action logs for a specific node', () => {
      actionExecutor.deleteNodeActionLogs('node-1');

      const logs1 = actionExecutor.getActionHistory('node-1');
      const logs2 = actionExecutor.getActionHistory('node-2');

      expect(logs1).toHaveLength(0);
      expect(logs2).toHaveLength(1);
    });
  });

  describe('cleanupOldLogs', () => {
    beforeEach(async () => {
      // 添加旧日志
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      const oldResult = {
        success: true,
        message: 'Old action',
        timestamp: oldDate
      };

      const newResult = {
        success: true,
        message: 'New action',
        timestamp: new Date()
      };

      await actionExecutor.logAction('node-1', 'old-action', oldResult);
      await actionExecutor.logAction('node-1', 'new-action', newResult);
    });

    it('should cleanup old action logs', () => {
      actionExecutor.cleanupOldLogs(30);

      const logs = actionExecutor.getActionHistory('node-1');

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('new-action');
    });
  });

  describe('integration test', () => {
    it('should execute action and log it automatically', async () => {
      const config: ActionConfig = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'ssh',
        host: 'server.example.com',
        command: 'systemctl restart myservice',
        requireConfirmation: true
      };

      const result = await actionExecutor.executeAction('node-1', 'restart', config);

      expect(result.success).toBe(true);

      // 验证日志已自动记录
      const logs = actionExecutor.getActionHistory('node-1');
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('restart');
      expect(logs[0].result.success).toBe(true);
    });
  });
});
