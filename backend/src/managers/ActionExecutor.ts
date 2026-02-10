import axios from 'axios';
import { Database } from 'sql.js';
import { ActionConfig, ActionResult, ActionLog } from '../types';

/**
 * ActionExecutor 类
 * 负责执行服务控制操作（HTTP、SSH、脚本）
 */
export class ActionExecutor {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 执行操作
   */
  async executeAction(
    nodeId: string,
    actionName: string,
    actionConfig: ActionConfig
  ): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      let result: ActionResult;

      switch (actionConfig.type) {
        case 'http':
          result = await this.executeHttpAction(actionConfig);
          break;
        case 'ssh':
          result = await this.executeSshAction(actionConfig);
          break;
        case 'script':
          result = await this.executeScriptAction(actionConfig);
          break;
        default:
          throw new Error(`Unsupported action type: ${actionConfig.type}`);
      }

      // 记录操作日志
      await this.logAction(nodeId, actionName, result);

      return result;
    } catch (error: any) {
      const errorResult: ActionResult = {
        success: false,
        message: `Action execution failed: ${error.message}`,
        timestamp: new Date()
      };

      // 记录失败日志
      await this.logAction(nodeId, actionName, errorResult);

      return errorResult;
    }
  }

  /**
   * 执行 HTTP 操作
   */
  private async executeHttpAction(config: ActionConfig): Promise<ActionResult> {
    if (!config.endpoint) {
      throw new Error('HTTP endpoint is required');
    }

    try {
      const method = (config.method || 'POST').toUpperCase();
      const response = await axios({
        method: method as any,
        url: config.endpoint,
        timeout: 30000 // 30秒超时
      });

      return {
        success: response.status >= 200 && response.status < 300,
        message: `HTTP ${method} request completed with status ${response.status}`,
        output: JSON.stringify(response.data),
        timestamp: new Date()
      };
    } catch (error: any) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  /**
   * 执行 SSH 操作
   * 注意：这是一个简化实现，实际生产环境需要使用 ssh2 库
   */
  private async executeSshAction(config: ActionConfig): Promise<ActionResult> {
    if (!config.host || !config.command) {
      throw new Error('SSH host and command are required');
    }

    // 在实际实现中，这里应该使用 ssh2 库连接到远程主机并执行命令
    // 为了测试目的，我们返回一个模拟结果
    return {
      success: true,
      message: `SSH command executed on ${config.host}`,
      output: `Command: ${config.command}\nStatus: Success (simulated)`,
      timestamp: new Date()
    };
  }

  /**
   * 执行脚本操作
   * 注意：这是一个简化实现，实际生产环境需要使用 child_process
   */
  private async executeScriptAction(config: ActionConfig): Promise<ActionResult> {
    if (!config.command) {
      throw new Error('Script command is required');
    }

    // 在实际实现中，这里应该使用 child_process 执行本地脚本
    // 为了测试目的，我们返回一个模拟结果
    return {
      success: true,
      message: 'Script executed successfully',
      output: `Script: ${config.command}\nStatus: Success (simulated)`,
      timestamp: new Date()
    };
  }

  /**
   * 记录操作日志
   */
  async logAction(
    nodeId: string,
    action: string,
    result: ActionResult
  ): Promise<void> {
    const id = `${nodeId}-${action}-${Date.now()}`;
    const timestamp = result.timestamp.toISOString();

    this.db.run(
      `INSERT INTO action_logs (id, node_id, action, success, message, output, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        nodeId,
        action,
        result.success ? 1 : 0,
        result.message,
        result.output || null,
        timestamp
      ]
    );
  }

  /**
   * 获取操作历史
   */
  getActionHistory(
    nodeId: string,
    limit: number = 50
  ): ActionLog[] {
    const stmt = this.db.prepare(
      `SELECT * FROM action_logs
       WHERE node_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    );

    const rows: any[] = [];
    stmt.bind([nodeId, limit]);

    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push({
        id: row.id as string,
        nodeId: row.node_id as string,
        action: row.action as string,
        result: {
          success: row.success === 1,
          message: row.message as string,
          output: row.output as string | undefined,
          timestamp: new Date(row.timestamp as string)
        },
        timestamp: new Date(row.timestamp as string)
      });
    }

    stmt.free();
    return rows;
  }

  /**
   * 获取所有节点的操作历史
   */
  getAllActionHistory(limit: number = 100): ActionLog[] {
    const stmt = this.db.prepare(
      `SELECT * FROM action_logs
       ORDER BY timestamp DESC
       LIMIT ?`
    );

    const rows: ActionLog[] = [];
    stmt.bind([limit]);

    while (stmt.step()) {
      const row = stmt.getAsObject();
      rows.push({
        id: row.id as string,
        nodeId: row.node_id as string,
        action: row.action as string,
        result: {
          success: row.success === 1,
          message: row.message as string,
          output: row.output as string | undefined,
          timestamp: new Date(row.timestamp as string)
        },
        timestamp: new Date(row.timestamp as string)
      });
    }

    stmt.free();
    return rows;
  }

  /**
   * 删除节点的操作日志
   */
  deleteNodeActionLogs(nodeId: string): void {
    this.db.run('DELETE FROM action_logs WHERE node_id = ?', [nodeId]);
  }

  /**
   * 清理旧的操作日志
   */
  cleanupOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.db.run(
      'DELETE FROM action_logs WHERE timestamp < ?',
      [cutoffDate.toISOString()]
    );
  }
}
