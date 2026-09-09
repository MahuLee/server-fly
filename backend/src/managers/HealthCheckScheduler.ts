import * as cron from 'node-cron';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Client as SSHClient } from 'ssh2';
import { HealthCheckConfig, HealthCheckResult, NodeState } from '../types';
import { query, execute } from '../database/init';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * 健康检查调度器
 * 负责定时执行健康检查任务，支持HTTP、TCP和脚本检查
 */
export class HealthCheckScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;
  private callbacks: Map<string, (nodeId: string, result: HealthCheckResult) => void> = new Map();

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('HealthCheckScheduler is already running');
      return;
    }
    this.isRunning = true;
    logger.info('HealthCheckScheduler started');
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
    logger.info('HealthCheckScheduler stopped');
  }

  /**
   * 注册健康检查任务
   * @param node 节点对象（包含 id 和 label）
   * @param config 健康检查配置
   */
  registerCheck(node: { id: string; label: string }, config: HealthCheckConfig): void {
    if (!this.isRunning) {
      logger.warn('HealthCheckScheduler is not running');
      return;
    }

    const nodeId = node.id;

    // 如果已存在该节点的任务，先取消
    if (this.tasks.has(nodeId)) {
      this.unregisterCheck(nodeId);
    }

    // 创建cron表达式（根据interval转换为cron格式）
    const cronExpression = this.intervalToCron(config.interval);

    // 创建定时任务
    const task = cron.schedule(cronExpression, async () => {
      try {
        const result = await this.executeCheck(node);
        this.notifyCheckComplete(nodeId, result);
      } catch (error) {
        logger.error(`Health check failed for node ${node.label} (${nodeId}):`, error);
      }
    });

    this.tasks.set(nodeId, task);
    logger.info(`Health check registered for node ${node.label} (${nodeId}) with interval ${config.interval}s`);
  }

  /**
   * 取消健康检查任务
   * @param nodeId 节点ID
   */
  unregisterCheck(nodeId: string): void {
    const task = this.tasks.get(nodeId);
    if (task) {
      task.stop();
      this.tasks.delete(nodeId);
      logger.info(`Health check unregistered for node ${nodeId}`);
    }
  }

  /**
   * 执行单次检查
   * @param node 节点对象（包含 id 和 label）
   * @returns 健康检查结果
   */
  async executeCheck(node: { id: string; label: string }): Promise<HealthCheckResult> {
    const nodeId = node.id;
    try {
      // 从数据库获取节点的健康检查配置和所有属性
      const nodeResults = query(
        `SELECT n.id, n.label, np.* FROM nodes n
         LEFT JOIN node_properties np ON n.id = np.node_id
         WHERE n.id = ?`,
        [nodeId]
      );
      logger.info('-----健康检查----->node_id:', nodeId, 'label:', node.label)
      if (nodeResults.length === 0) {
        return {
          nodeId,
          success: false,
          status: 'error',
          responseTime: 0,
          message: 'Node not found',
          timestamp: new Date()
        };
      }

      const nodeProps = nodeResults[0];
      const healthCheckJson = nodeProps.health_check;
      
      if (!healthCheckJson) {
        return {
          nodeId,
          success: false,
          status: 'error',
          responseTime: 0,
          message: 'No health check configuration',
          timestamp: new Date()
        };
      }

      const config: HealthCheckConfig = JSON.parse(healthCheckJson);
      
      // 为缺少的字段添加默认值
      const configWithDefaults: HealthCheckConfig = {
        type: config.type,
        interval: config.interval || 30,
        timeout: config.timeout || 5,
        retries: config.retries || 3,
        endpoint: config.endpoint,
        host: config.host,
        port: config.port,
        scriptContent: config.scriptContent,
        expectedStatus: config.expectedStatus || 200
      };
      
      const startTime = Date.now();

      let result: HealthCheckResult;

      // 根据检查类型执行相应的检查，传入完整的节点属性
      switch (configWithDefaults.type) {
        case 'http':
          result = await this.checkHttp(nodeId, configWithDefaults, nodeProps);
          break;
        case 'tcp':
          result = await this.checkTcp(nodeId, configWithDefaults, nodeProps);
          break;
        case 'script':
          result = await this.checkScript(nodeId, configWithDefaults, nodeProps);
          break;
        default:
          result = {
            nodeId,
            success: false,
            status: 'error',
            responseTime: 0,
            message: `Unknown health check type: ${configWithDefaults.type}`,
            timestamp: new Date()
          };
      }

      result.responseTime = Date.now() - startTime;
      result.timestamp = new Date();
      logger.info('-----健康检查结果----->node_id:', nodeId, 'label:', node.label, result)
      // 更新节点状态
      this.updateNodeState(nodeId, result);

      return result;
    } catch (error: any) {
      return {
        nodeId,
        success: false,
        status: 'error',
        responseTime: 0,
        message: error.message || 'Health check error',
        timestamp: new Date()
      };
    }
  }

  /**
   * HTTP健康检查
   * @param nodeId 节点ID
   * @param config 健康检查配置
   * @param nodeProps 节点属性
   * @returns 检查结果
   */
  private async checkHttp(nodeId: string, config: HealthCheckConfig, nodeProps: any): Promise<HealthCheckResult> {
    return new Promise((resolve) => {
      // 使用 config.endpoint，如果没有则使用节点的 ip 和 port 构建
      let endpoint = config.endpoint;
      if (!endpoint && nodeProps.ip) {
        const protocol = 'http';
        const port = nodeProps.port || 80;
        endpoint = `${protocol}://${nodeProps.ip}:${port}`;
      }
      
      if (!endpoint) {
        resolve({
          nodeId,
          success: false,
          status: 'error',
          responseTime: 0,
          message: 'No endpoint configured for HTTP health check',
          timestamp: new Date()
        });
        return;
      }

      const url = new URL(endpoint);
      const protocol = url.protocol === 'https:' ? https : http;
      const expectedStatus = config.expectedStatus || 200;

      const request = protocol.get(url, { timeout: config.timeout * 1000 }, (response) => {
        const success = response.statusCode === expectedStatus;
        resolve({
          nodeId,
          success,
          status: success ? 'running' : 'error',
          responseTime: 0,
          message: success
            ? `HTTP ${response.statusCode} OK`
            : `HTTP ${response.statusCode} (expected ${expectedStatus})`,
          timestamp: new Date()
        });
      });

      request.on('error', (error) => {
        resolve({
          nodeId,
          success: false,
          status: 'error',
          responseTime: 0,
          message: `HTTP error: ${error.message}`,
          timestamp: new Date()
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({
          nodeId,
          success: false,
          status: 'error',
          responseTime: 0,
          message: `HTTP timeout after ${config.timeout}s`,
          timestamp: new Date()
        });
      });
    });
  }

  /**
   * TCP健康检查
   * @param nodeId 节点ID
   * @param config 健康检查配置
   * @param nodeProps 节点属性
   * @returns 检查结果
   */
  private async checkTcp(nodeId: string, config: HealthCheckConfig, nodeProps: any): Promise<HealthCheckResult> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      // 优先使用节点属性中的 ip 和 port
      const host = nodeProps.ip || config.host || '';
      const port = nodeProps.port || config.port;
      socket.setTimeout(config.timeout * 1000);

      socket.on('connect', () => {
        socket.destroy();
        resolve({
          nodeId,
          success: true,
          status: 'running',
          responseTime: 0,
          message: `TCP connection successful to ${host}:${port}`,
          timestamp: new Date()
        });
      });

      socket.on('error', (error) => {
        socket.destroy();
        resolve({
          nodeId,
          success: false,
          status: 'error',
          responseTime: 0,
          message: `TCP error: ${error.message}`,
          timestamp: new Date()
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          nodeId,
          success: false,
          status: 'error',
          responseTime: 0,
          message: `TCP timeout after ${config.timeout}s`,
          timestamp: new Date()
        });
      });

      socket.connect(port, host);
    });
  }

  /**
   * 脚本健康检查
   * @param nodeId 节点ID
   * @param config 健康检查配置
   * @param nodeProps 节点属性
   * @returns 检查结果
   */
  private async checkScript(nodeId: string, config: HealthCheckConfig, nodeProps: any): Promise<HealthCheckResult> {
    try {
      const scriptPath = config.scriptContent || '';
      
      if (!scriptPath) {
        return {
          nodeId,
          success: false,
          status: 'error',
          responseTime: 0,
          message: 'No script configured for script health check',
          timestamp: new Date()
        };
      }

      // 获取服务器连接信息
      let serverIp: string;
      let serverUsername: string;
      let serverPassword: string;

      // 1. 判断是否有 server_id
      if (nodeProps.server_id) {
        // 有 server_id，说明是服务器上的服务节点，需要查询服务器信息
        const serverResults = query(
          `SELECT ip, username, password FROM node_properties WHERE node_id = ?`,
          [nodeProps.server_id]
        );

        if (serverResults.length === 0) {
          return {
            nodeId,
            success: false,
            status: 'error',
            responseTime: 0,
            message: `Server node not found: ${nodeProps.server_id}`,
            timestamp: new Date()
          };
        }

        const serverProps = serverResults[0];
        serverIp = serverProps.ip;
        serverUsername = serverProps.username;
        serverPassword = serverProps.password;

        if (!serverIp || !serverUsername || !serverPassword) {
          return {
            nodeId,
            success: false,
            status: 'error',
            responseTime: 0,
            message: 'Server connection info incomplete (ip, username, or password missing)',
            timestamp: new Date()
          };
        }
      } else {
        // 2. 没有 server_id，说明该节点本身就是服务器节点
        serverIp = nodeProps.ip;
        serverUsername = nodeProps.username;
        serverPassword = nodeProps.password;

        if (!serverIp || !serverUsername || !serverPassword) {
          return {
            nodeId,
            success: false,
            status: 'error',
            responseTime: 0,
            message: 'Server connection info incomplete (ip, username, or password missing)',
            timestamp: new Date()
          };
        }
      }

      // 通过 SSH 连接到服务器并执行脚本
      const result = await this.executeScriptViaSSH(
        serverIp,
        serverUsername,
        serverPassword,
        scriptPath,
        config.timeout
      );

      return {
        nodeId,
        success: result.success,
        status: result.success ? 'running' : 'error',
        responseTime: 0,
        message: result.message,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        nodeId,
        success: false,
        status: 'error',
        responseTime: 0,
        message: `Script error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * 通过 SSH 执行脚本
   * @param host SSH 主机地址
   * @param username SSH 用户名
   * @param password SSH 密码
   * @param scriptPath 脚本路径或命令
   * @param timeout 超时时间（秒）
   * @returns 执行结果
   */
  private async executeScriptViaSSH(
    host: string,
    username: string,
    password: string,
    scriptPath: string,
    timeout: number
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const conn = new SSHClient();
      let isResolved = false;

      // 设置超时
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          conn.end();
          resolve({
            success: false,
            message: `SSH timeout after ${timeout}s`
          });
        }
      }, timeout * 1000);

      conn.on('ready', () => {
        logger.debug(`SSH connection established to ${host}`);
        
        // 执行脚本
        conn.exec(scriptPath, (err, stream) => {
          if (err) {
            clearTimeout(timeoutId);
            if (!isResolved) {
              isResolved = true;
              conn.end();
              resolve({
                success: false,
                message: `SSH exec error: ${err.message}`
              });
            }
            return;
          }

          let stdout = '';
          let stderr = '';

          stream.on('close', (code: number, signal: string) => {
            clearTimeout(timeoutId);
            conn.end();
            
            if (!isResolved) {
              isResolved = true;
              
              if (code === 0) {
                resolve({
                  success: true,
                  message: `Script executed successfully: ${stdout.trim() || '(no output)'}`
                });
              } else {
                resolve({
                  success: false,
                  message: `Script failed with exit code ${code}: ${stderr.trim() || stdout.trim()}`
                });
              }
            }
          });

          stream.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timeoutId);
        if (!isResolved) {
          isResolved = true;
          resolve({
            success: false,
            message: `SSH connection error: ${err.message}`
          });
        }
      });

      // 连接到 SSH 服务器
      try {
        conn.connect({
          host: host,
          port: 22,
          username: username,
          password: password,
          readyTimeout: timeout * 1000
        });
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (!isResolved) {
          isResolved = true;
          resolve({
            success: false,
            message: `SSH connect error: ${error.message}`
          });
        }
      }
    });
  }

  /**
   * 更新节点状态
   * @param nodeId 节点ID
   * @param result 健康检查结果
   */
  private updateNodeState(nodeId: string, result: HealthCheckResult): void {
    try {
      const now = new Date();
      execute(
        `UPDATE node_states SET status = ?, last_check_time = ?, message = ?, updated_at = ?
         WHERE node_id = ?`,
        [result.status, now.toISOString(), result.message, now.toISOString(), nodeId]
      );
    } catch (error) {
      logger.error(`Failed to update node state for ${nodeId}:`, error);
    }
  }

  /**
   * 监听检查完成事件
   * @param eventName 事件名称
   * @param callback 回调函数
   */
  onCheckComplete(callback: (nodeId: string, result: HealthCheckResult) => void): void {
    const eventId = `check_complete_${Date.now()}`;
    this.callbacks.set(eventId, callback);
  }

  /**
   * 通知检查完成
   * @param nodeId 节点ID
   * @param result 检查结果
   */
  private notifyCheckComplete(nodeId: string, result: HealthCheckResult): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(nodeId, result);
      } catch (error) {
        logger.error('Error in health check callback:', error);
      }
    });
  }

  /**
   * 将间隔（秒）转换为cron表达式
   * @param intervalSeconds 间隔（秒）
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
}

export default HealthCheckScheduler;
