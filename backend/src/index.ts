import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase, query, execute } from './database/init';
import { EnvironmentManager } from './managers/EnvironmentManager';
import { HealthCheckScheduler } from './managers/HealthCheckScheduler';
import { StatusHistoryManager } from './managers/StatusHistoryManager';
import { DataCollector } from './managers/DataCollector';
import { ActionExecutor } from './managers/ActionExecutor';
import { WebSocketService } from './managers/WebSocketService';
import { DataPushScheduler } from './managers/DataPushScheduler';
import { DataCleanupScheduler } from './managers/DataCleanupScheduler';
import { MetricsScheduler } from './managers/MetricsScheduler';
import { GraphDataModel } from './models/GraphDataModel';
import { ApiResponse, GraphData, Node, Edge } from './types';
import { logger } from './utils/logger';

// 加载环境变量
dotenv.config();

const uuid: any = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const envManager = new EnvironmentManager();
const healthCheckScheduler = new HealthCheckScheduler();
const statusHistoryManager = new StatusHistoryManager();
const dataCollector = new DataCollector();
const webSocketService = new WebSocketService();
let metricsScheduler: MetricsScheduler;
let actionExecutor: ActionExecutor;
let dataPushScheduler: DataPushScheduler;
let dataCleanupScheduler: DataCleanupScheduler;

// 中间件
// CORS 配置 - 允许前端跨域请求
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3003'], // 允许的前端地址
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 错误处理中间件
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  } as ApiResponse<null>);
});

// 健康检查端点
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ============ 环境管理 API ============

// GET /api/environments - 获取所有环境
app.get('/api/environments', async (req: Request, res: Response) => {
  try {
    const environments = await envManager.listEnvironments();
    res.json({
      success: true,
      data: environments
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// POST /api/environments - 创建环境
app.post('/api/environments', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'name and description are required'
      } as ApiResponse<null>);
    }

    const environment = await envManager.createEnvironment(name, description);
    res.status(201).json({
      success: true,
      data: environment
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// GET /api/environments/:id - 获取单个环境
app.get('/api/environments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const environment = await envManager.getEnvironment(id);

    if (!environment) {
      return res.status(404).json({
        success: false,
        error: `Environment with id ${id} not found`
      } as ApiResponse<null>);
    }

    res.json({
      success: true,
      data: environment
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// PUT /api/environments/:id - 更新环境
app.put('/api/environments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const environment = await envManager.updateEnvironment(id, { name, description });
    res.json({
      success: true,
      data: environment
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// DELETE /api/environments/:id - 删除环境
app.delete('/api/environments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await envManager.deleteEnvironment(id);

    res.json({
      success: true,
      message: `Environment ${id} deleted`
    } as ApiResponse<null>);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// ============ 架构图管理 API ============

// GET /api/environments/:envId/graph - 获取架构图
app.get('/api/environments/:envId/graph', async (req: Request, res: Response) => {
  try {
    const { envId } = req.params;

    // 验证环境存在
    const env = await envManager.getEnvironment(envId);
    if (!env) {
      return res.status(404).json({
        success: false,
        error: `Environment with id ${envId} not found`
      } as ApiResponse<null>);
    }

    // 获取架构图数据
    const results = query(
      `SELECT data FROM graph_data WHERE environment_id = ?`,
      [envId]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Graph data for environment ${envId} not found`
      } as ApiResponse<null>);
    }

    const graphData = GraphDataModel.deserialize(results[0].data);
    
    // 从数据库中获取每个节点的最新状态
    for (const node of graphData.nodes) {
      try {
        const stateResults = query(
          `SELECT status, last_check_time, message, metrics 
           FROM node_states 
           WHERE node_id = ? 
           ORDER BY updated_at DESC 
           LIMIT 1`,
          [node.id]
        );
        
        if (stateResults.length > 0) {
          const stateRow = stateResults[0];
          
          // 解析 metrics JSON
          let metrics = null;
          if (stateRow.metrics) {
            try {
              metrics = JSON.parse(stateRow.metrics);
            } catch (e) {
              logger.warn(`Failed to parse metrics for node ${node.id}`);
            }
          }
          
          // 更新节点状态
          node.state = {
            status: stateRow.status || 'unknown',
            lastCheckTime: stateRow.last_check_time ? new Date(stateRow.last_check_time) : new Date(),
            message: stateRow.message || undefined,
            metrics: metrics || undefined
          };
        } else {
          // 如果没有状态记录，设置默认状态
          node.state = {
            status: 'unknown',
            lastCheckTime: new Date()
          };
        }
      } catch (error: any) {
        logger.error(`Failed to load state for node ${node.id}:`, error.message);
        // 设置默认状态
        node.state = {
          status: 'unknown',
          lastCheckTime: new Date()
        };
      }
    }
    
    res.json({
      success: true,
      data: graphData
    } as ApiResponse<GraphData>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// PUT /api/environments/:envId/graph - 更新架构图
app.put('/api/environments/:envId/graph', async (req: Request, res: Response) => {
  try {
    const { envId } = req.params;
    const graphData = req.body as GraphData;

    // 验证环境存在
    const env = await envManager.getEnvironment(envId);
    if (!env) {
      return res.status(404).json({
        success: false,
        error: `Environment with id ${envId} not found`
      } as ApiResponse<null>);
    }

    // 验证架构图数据
    const validation = GraphDataModel.validate(graphData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid graph data: ${validation.errors.join(', ')}`
      } as ApiResponse<null>);
    }

    // 序列化并保存
    const serialized = GraphDataModel.serialize(graphData);
    const now = new Date();

    // 1. 更新graph_data
    execute(
      `UPDATE graph_data SET data = ?, updated_at = ? WHERE environment_id = ?`,
      [serialized, now.toISOString(), envId]
    );

    // 2. 同步更新nodes表
    // 获取当前数据库中的节点ID列表
    const existingNodesResult = query(
      `SELECT id FROM nodes WHERE environment_id = ?`,
      [envId]
    );
    const existingNodeIds = new Set(existingNodesResult.map((row: any) => row.id));
    const newNodeIds = new Set(graphData.nodes.map(node => node.id));

    // 删除不再存在的节点
    for (const existingId of existingNodeIds) {
      if (!newNodeIds.has(existingId)) {
        //node_properties 有外键FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE，不用手动删除node_properties
        execute(`DELETE FROM nodes WHERE id = ?`, [existingId]);
      }
    }

    // 更新或插入节点
    for (const node of graphData.nodes) {
      const width = node.properties.size?.[0] || null;
      const height = node.properties.size?.[1] || null;

      if (existingNodeIds.has(node.id)) {
        // 更新现有节点
        execute(
          `UPDATE nodes SET type = ?, label = ?, x = ?, y = ?, width = ?, height = ?, updated_at = ? WHERE id = ?`,
          [node.type, node.label, node.x, node.y, width, height, now.toISOString(), node.id]
        );
      } else {
        // 插入新节点
        execute(
          `INSERT INTO nodes (id, environment_id, type, label, x, y, width, height, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [node.id, envId, node.type, node.label, node.x, node.y, width, height, now.toISOString(), now.toISOString()]
        );

        // 为新节点创建初始状态
        const stateId = uuid.v4();
        execute(
          `INSERT INTO node_states (id, node_id, status, last_check_time, message, metrics, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [stateId, node.id, 'unknown', null, null, null, now.toISOString(), now.toISOString()]
        );
      }
    }

    // 3. 同步更新node_properties表
    for (const node of graphData.nodes) {
      const props = node.properties;
      
      // 检查node_properties记录是否存在
      const propsResult = query(
        `SELECT id FROM node_properties WHERE node_id = ?`,
        [node.id]
      );

      // 确定节点的IP地址
      let nodeIp = props.ip || null;
      
      // 如果不是服务器节点，且有serverId，则从所属服务器获取IP
      if (node.type !== 'server' && props.serverId) {
        const serverNode = graphData.nodes.find(n => n.id === props.serverId);
        if (serverNode && serverNode.properties.ip) {
          nodeIp = serverNode.properties.ip;
        }
      }

      // 序列化复杂对象
      const healthCheckJson = props.healthCheck ? JSON.stringify(props.healthCheck) : null;
      const metricsJson = props.metrics ? JSON.stringify(props.metrics) : null;
      const actionsJson = props.actions ? JSON.stringify(props.actions) : null;
      const metadataJson = props.metadata ? JSON.stringify(props.metadata) : null;

      if (propsResult.length > 0) {
        // 更新现有属性
        execute(
          `UPDATE node_properties 
           SET ip = ?, port = ?, username = ?, password = ?, server_id = ?, resource_path = ?,
               health_check = ?, metrics = ?, actions = ?, metadata = ?, updated_at = ?
           WHERE node_id = ?`,
          [
            nodeIp,
            props.port || null,
            props.username || null,
            props.password || null,
            props.serverId || null,
            props.resourcePath || null,
            healthCheckJson,
            metricsJson,
            actionsJson,
            metadataJson,
            now.toISOString(),
            node.id
          ]
        );
      } else {
        // 插入新属性
        const propId = uuid.v4();
        execute(
          `INSERT INTO node_properties 
           (id, node_id, ip, port, username, password, server_id, resource_path, 
            health_check, metrics, actions, metadata, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            propId,
            node.id,
            nodeIp,
            props.port || null,
            props.username || null,
            props.password || null,
            props.serverId || null,
            props.resourcePath || null,
            healthCheckJson,
            metricsJson,
            actionsJson,
            metadataJson,
            now.toISOString(),
            now.toISOString()
          ]
        );
      }
    }

    // 4. 同步更新edges表
    // 获取当前数据库中的边ID列表
    const existingEdgesResult = query(
      `SELECT id FROM edges WHERE environment_id = ?`,
      [envId]
    );
    const existingEdgeIds = new Set(existingEdgesResult.map((row: any) => row.id));
    const newEdgeIds = new Set(graphData.edges.map(edge => edge.id));

    // 删除不再存在的边
    for (const existingId of existingEdgeIds) {
      if (!newEdgeIds.has(existingId)) {
        execute(`DELETE FROM edges WHERE id = ?`, [existingId]);
      }
    }

    // 更新或插入边
    for (const edge of graphData.edges) {
      const styleJson = edge.style ? JSON.stringify(edge.style) : null;
      const animated = edge.animated ? 1 : 0;

      if (existingEdgeIds.has(edge.id)) {
        // 更新现有边
        execute(
          `UPDATE edges 
           SET source_id = ?, target_id = ?, source_handle = ?, target_handle = ?, 
               label = ?, style = ?, animated = ?, marker_end = ?, updated_at = ?
           WHERE id = ?`,
          [
            edge.source,
            edge.target,
            edge.sourceHandle || null,
            edge.targetHandle || null,
            edge.label || null,
            styleJson,
            animated,
            edge.markerEnd || null,
            now.toISOString(),
            edge.id
          ]
        );
      } else {
        // 插入新边
        execute(
          `INSERT INTO edges 
           (id, environment_id, source_id, target_id, source_handle, target_handle, 
            label, style, animated, marker_end, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            edge.id,
            envId,
            edge.source,
            edge.target,
            edge.sourceHandle || null,
            edge.targetHandle || null,
            edge.label || null,
            styleJson,
            animated,
            edge.markerEnd || null,
            now.toISOString(),
            now.toISOString()
          ]
        );
      }
    }

    // 5. 更新健康检查调度器
    // 取消已删除节点的健康检查
    for (const existingId of existingNodeIds) {
      if (!newNodeIds.has(existingId)) {
        healthCheckScheduler.unregisterCheck(existingId);
        metricsScheduler.unregisterMetricsCollection(existingId);
      }
    }

    // 注册或更新节点的健康检查
    for (const node of graphData.nodes) {
      if (node.properties.healthCheck) {
        try {
          // 为缺少的字段添加默认值
          const configWithDefaults = {
            type: node.properties.healthCheck.type,
            interval: node.properties.healthCheck.interval || 30,  // 默认30秒
            timeout: node.properties.healthCheck.timeout || 5,     // 默认5秒超时
            retries: node.properties.healthCheck.retries || 3,     // 默认重试3次
            endpoint: node.properties.healthCheck.endpoint,
            host: node.properties.healthCheck.host,
            port: node.properties.healthCheck.port,
            scriptContent: node.properties.healthCheck.scriptContent,
            expectedStatus: node.properties.healthCheck.expectedStatus || 200
          };

          healthCheckScheduler.registerCheck(node, configWithDefaults);
          console.log(`Health check registered/updated for node ${node.label} (${node.id})`);
        } catch (error: any) {
          console.error(`Failed to register health check for node ${node.id}:`, error.message);
        }
      } else {
        // 如果节点移除了健康检查配置，取消注册
        healthCheckScheduler.unregisterCheck(node.id);
      }

      // 6. 更新指标采集调度器
      if (node.properties.metrics) {
        try {
          metricsScheduler.registerMetricsCollection(node.id, node.properties.metrics);
          console.log(`Metrics collection registered/updated for node ${node.label} (${node.id})`);
        } catch (error: any) {
          console.error(`Failed to register metrics collection for node ${node.id}:`, error.message);
        }
      } else {
        // 如果节点移除了指标配置，取消注册
        metricsScheduler.unregisterMetricsCollection(node.id);
      }
    }

    res.json({
      success: true,
      data: graphData
    } as ApiResponse<GraphData>);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// ============ 状态历史 API ============

// GET /api/nodes/:nodeId/status/history - 获取节点的状态历史
app.get('/api/nodes/:nodeId/status/history', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { limit = 100, startTime, endTime } = req.query;

    // 验证节点存在
    const nodeResults = query(
      `SELECT * FROM nodes WHERE id = ?`,
      [nodeId]
    );

    if (nodeResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Node with id ${nodeId} not found`
      } as ApiResponse<null>);
    }

    let history;

    // 如果提供了时间范围，使用时间范围查询
    if (startTime && endTime) {
      const start = new Date(startTime as string);
      const end = new Date(endTime as string);
      history = statusHistoryManager.getStatusHistoryByTimeRange(nodeId, start, end);
    } else {
      // 否则使用limit查询
      history = statusHistoryManager.getStatusHistory(nodeId, parseInt(limit as string) || 100);
    }

    res.json({
      success: true,
      data: history
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// GET /api/nodes/:nodeId/status/latest - 获取节点的最新状态
app.get('/api/nodes/:nodeId/status/latest', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;

    // 验证节点存在
    const nodeResults = query(
      `SELECT * FROM nodes WHERE id = ?`,
      [nodeId]
    );

    if (nodeResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Node with id ${nodeId} not found`
      } as ApiResponse<null>);
    }

    const latestStatus = statusHistoryManager.getLatestStatus(nodeId);

    res.json({
      success: true,
      data: latestStatus
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// GET /api/nodes/:nodeId/status/stats - 获取节点的状态变化统计
app.get('/api/nodes/:nodeId/status/stats', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { timeRange = 3600 } = req.query;

    // 验证节点存在
    const nodeResults = query(
      `SELECT * FROM nodes WHERE id = ?`,
      [nodeId]
    );

    if (nodeResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Node with id ${nodeId} not found`
      } as ApiResponse<null>);
    }

    const stats = statusHistoryManager.getStatusChangeStats(
      nodeId,
      parseInt(timeRange as string) || 3600
    );

    res.json({
      success: true,
      data: stats
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// ============ 监控数据 API ============

// GET /api/nodes/:nodeId/metrics/history - 获取节点的指标数据历史
app.get('/api/nodes/:nodeId/metrics/history', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { metricName, limit = 100, startTime, endTime } = req.query;

    // 验证节点存在
    const nodeResults = query(
      `SELECT * FROM nodes WHERE id = ?`,
      [nodeId]
    );

    if (nodeResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Node with id ${nodeId} not found`
      } as ApiResponse<null>);
    }

    let metricsData;

    // 如果提供了时间范围，使用时间范围查询
    if (startTime && endTime) {
      const start = new Date(startTime as string);
      const end = new Date(endTime as string);
      metricsData = dataCollector.getMetricsByTimeRange(
        nodeId,
        start,
        end,
        metricName as string | undefined
      );
    } else {
      // 否则使用limit查询
      metricsData = dataCollector.getMetricsHistory(
        nodeId,
        metricName as string | undefined,
        parseInt(limit as string) || 100
      );
    }

    res.json({
      success: true,
      data: metricsData
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// GET /api/nodes/:nodeId/metrics/latest - 获取节点的最新指标数据
app.get('/api/nodes/:nodeId/metrics/latest', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;

    // 验证节点存在
    const nodeResults = query(
      `SELECT * FROM nodes WHERE id = ?`,
      [nodeId]
    );

    if (nodeResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Node with id ${nodeId} not found`
      } as ApiResponse<null>);
    }

    const latestMetrics = dataCollector.getLatestMetrics(nodeId);

    res.json({
      success: true,
      data: latestMetrics
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// POST /api/nodes/:nodeId/metrics/collect - 手动触发指标收集
app.post('/api/nodes/:nodeId/metrics/collect', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;

    // 验证节点存在并获取其配置
    const nodeResults = query(
      `SELECT * FROM nodes WHERE id = ?`,
      [nodeId]
    );

    if (nodeResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Node with id ${nodeId} not found`
      } as ApiResponse<null>);
    }

    const envId = nodeResults[0].environment_id;

    // 获取节点的监控配置
    const propsResults = query(
      `SELECT metrics FROM node_properties WHERE node_id = ?`,
      [nodeId]
    );

    if (propsResults.length === 0 || !propsResults[0].metrics) {
      return res.status(400).json({
        success: false,
        error: 'Node does not have metrics configuration'
      } as ApiResponse<null>);
    }

    const metricsConfig = JSON.parse(propsResults[0].metrics);

    // 收集指标
    const metricsData = await dataCollector.collectMetrics(nodeId, metricsConfig);

    // 使用事件驱动推送（立即推送，带防抖）
    dataPushScheduler.pushNodeMetrics(envId, nodeId, metricsData);

    res.json({
      success: true,
      data: metricsData
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// POST /api/metrics/test-connection - 测试指标端点连接
app.post('/api/metrics/test-connection', async (req: Request, res: Response) => {
  try {
    const { endpoint, metrics, timeout } = req.body;

    // 验证必填字段
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint is required'
      } as ApiResponse<null>);
    }

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Metrics array is required and must not be empty'
      } as ApiResponse<null>);
    }

    const startTime = Date.now();

    // 发起 HTTP 请求测试连接
    const axios = require('axios');
    const response = await axios.get(endpoint, {
      timeout: (timeout || 5) * 1000,  // 默认5秒超时
      validateStatus: () => true  // 接受所有状态码，手动处理
    });

    const responseTime = Date.now() - startTime;

    // 检查响应状态
    if (response.status < 200 || response.status >= 300) {
      return res.status(400).json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        data: {
          responseTime,
          status: response.status
        }
      } as ApiResponse<any>);
    }

    // 解析 JSON 响应
    const responseData = response.data;

    // 提取配置的指标
    const previewMetrics: any[] = [];
    const errors: string[] = [];

    for (const metricDef of metrics) {
      try {
        // 从响应中提取指标值（使用路径）
        const value = extractValueByPath(responseData, metricDef.path);

        if (value !== undefined && value !== null) {
          previewMetrics.push({
            name: metricDef.name,
            path: metricDef.path,
            value: Number(value),
            unit: metricDef.unit,
            found: true
          });
        } else {
          previewMetrics.push({
            name: metricDef.name,
            path: metricDef.path,
            value: null,
            unit: metricDef.unit,
            found: false
          });
          errors.push(`指标 "${metricDef.name}" 在路径 "${metricDef.path}" 未找到`);
        }
      } catch (error: any) {
        previewMetrics.push({
          name: metricDef.name,
          path: metricDef.path,
          value: null,
          unit: metricDef.unit,
          found: false,
          error: error.message
        });
        errors.push(`指标 "${metricDef.name}" 提取失败: ${error.message}`);
      }
    }

    res.json({
      success: true,
      data: {
        endpoint,
        responseTime,
        status: response.status,
        metrics: previewMetrics,
        warnings: errors.length > 0 ? errors : undefined,
        rawResponse: responseData  // 返回原始响应供调试
      }
    } as ApiResponse<any>);

  } catch (error: any) {
    // 网络错误或其他异常
    let errorMessage = error.message;

    if (error.code === 'ECONNREFUSED') {
      errorMessage = '连接被拒绝，请检查端点地址是否正确';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = '连接超时，请检查网络或增加超时时间';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = '无法解析主机名，请检查端点地址';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      code: error.code
    } as ApiResponse<null>);
  }
});

/**
 * 从对象中按路径提取值
 * @param obj 对象
 * @param path 路径（例如 "cpu.usage" 或 "memory.used"）
 * @returns 提取的值
 */
function extractValueByPath(obj: any, path: string): any {
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

// ============ 操作执行 API ============

// POST /api/nodes/:nodeId/actions/:actionName - 执行操作
app.post('/api/nodes/:nodeId/actions/:actionName', async (req: Request, res: Response) => {
  try {
    const { nodeId, actionName } = req.params;

    // 验证节点存在
    const nodeResults = query(
      `SELECT * FROM nodes WHERE id = ?`,
      [nodeId]
    );

    if (nodeResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Node with id ${nodeId} not found`
      } as ApiResponse<null>);
    }

    // 获取节点的操作配置
    const propsResults = query(
      `SELECT actions FROM node_properties WHERE node_id = ?`,
      [nodeId]
    );

    if (propsResults.length === 0 || !propsResults[0].actions) {
      return res.status(400).json({
        success: false,
        error: 'Node does not have actions configuration'
      } as ApiResponse<null>);
    }

    const actions = JSON.parse(propsResults[0].actions);
    const actionConfig = actions.find((a: any) => a.name === actionName);

    if (!actionConfig) {
      return res.status(404).json({
        success: false,
        error: `Action '${actionName}' not found for this node`
      } as ApiResponse<null>);
    }

    // 执行操作
    const result = await actionExecutor.executeAction(nodeId, actionName, actionConfig);

    res.json({
      success: true,
      data: result
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// GET /api/nodes/:nodeId/actions/history - 获取操作历史
app.get('/api/nodes/:nodeId/actions/history', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    // 验证节点存在
    const nodeResults = query(
      `SELECT * FROM nodes WHERE id = ?`,
      [nodeId]
    );

    if (nodeResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Node with id ${nodeId} not found`
      } as ApiResponse<null>);
    }

    const history = actionExecutor.getActionHistory(nodeId, limit);

    res.json({
      success: true,
      data: history
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// GET /api/actions/history - 获取所有操作历史
app.get('/api/actions/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const history = actionExecutor.getAllActionHistory(limit);

    res.json({
      success: true,
      data: history
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// ============ WebSocket 状态 API ============

// GET /api/websocket/status - 获取 WebSocket 服务状态
app.get('/api/websocket/status', async (req: Request, res: Response) => {
  try {
    const status = {
      totalClients: webSocketService.getClientCount(),
      environments: {} as Record<string, number>
    };

    // 获取所有环境的客户端数量
    const environments = await envManager.listEnvironments();
    environments.forEach((env: any) => {
      status.environments[env.id] = webSocketService.getEnvironmentClientCount(env.id);
    });

    res.json({
      success: true,
      data: status
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// ============ 数据清理 API ============

// GET /api/admin/cleanup/stats - 获取数据统计
app.get('/api/admin/cleanup/stats', async (req: Request, res: Response) => {
  try {
    const stats = dataCleanupScheduler.getDataStats();
    const config = dataCleanupScheduler.getConfig();

    res.json({
      success: true,
      data: {
        config,
        stats
      }
    } as ApiResponse<any>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// POST /api/admin/cleanup/manual - 手动触发数据清理
app.post('/api/admin/cleanup/manual', async (req: Request, res: Response) => {
  try {
    await dataCleanupScheduler.manualCleanup();

    res.json({
      success: true,
      message: 'Data cleanup completed'
    } as ApiResponse<null>);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    } as ApiResponse<null>);
  }
});

// 启动服务器
async function start() {
  try {
    // 初始化数据库
    const db = await initializeDatabase();
    logger.info('Database initialized');
    
    // 初始化 ActionExecutor
    actionExecutor = new ActionExecutor(db);
    logger.info('Action executor initialized');
    
    // 创建 HTTP 服务器
    const server = createServer(app);
    
    // 启动 WebSocket 服务
    webSocketService.start(server);
    logger.info('WebSocket service started');
    
    // 初始化数据推送调度器
    dataPushScheduler = new DataPushScheduler(webSocketService, dataCollector);
    logger.info('Data push scheduler initialized');
    
    // 注册健康检查完成回调，通过推送调度器推送状态更新
    healthCheckScheduler.onCheckComplete((nodeId, result) => {
      // 获取节点所属的环境ID
      const nodeResults = query(
        `SELECT environment_id FROM nodes WHERE id = ?`,
        [nodeId]
      );
      
      if (nodeResults.length > 0) {
        const envId = nodeResults[0].environment_id;
        
        // 使用事件驱动推送（立即推送，带防抖）
        dataPushScheduler.pushNodeState(envId, nodeId, {
          status: result.status,
          lastCheckTime: result.timestamp,
          message: result.message
        });
      }
    });
    
    // 启动健康检查调度器
    healthCheckScheduler.start();
    logger.info('Health check scheduler started');

    // 初始化并启动指标采集调度器
    metricsScheduler = new MetricsScheduler(dataCollector);
    metricsScheduler.start();
    logger.info('Metrics scheduler started');

    // 注册指标采集完成回调，通过推送调度器推送指标数据
    metricsScheduler.onCollectionComplete((nodeId, metrics) => {
      // 获取节点所属的环境ID
      const nodeResults = query(
        `SELECT environment_id FROM nodes WHERE id = ?`,
        [nodeId]
      );

      if (nodeResults.length > 0) {
        const envId = nodeResults[0].environment_id;

        // 使用事件驱动推送（立即推送，带防抖）
        dataPushScheduler.pushNodeMetrics(envId, nodeId, metrics);

        logger.debug(`Pushed ${metrics.length} metrics for node ${nodeId}`);
      }
    });

    // 加载所有环境的所有节点健康检查
    await loadAllHealthChecks();

    // 加载所有环境的所有节点指标采集配置
    await loadAllMetricsCollections();
    
    // 启动数据推送调度器
    dataPushScheduler.start();
    const config = dataPushScheduler.getConfig();
    logger.info(`Data push scheduler started (debounce: ${config.debounceMs}ms, heartbeat: ${config.heartbeatIntervalMs / 1000}s)`);
    
    // 启动数据清理调度器
    dataCleanupScheduler = new DataCleanupScheduler();
    dataCleanupScheduler.start();
    const cleanupConfig = dataCleanupScheduler.getConfig();
    logger.info(`Data cleanup scheduler started (retention: ${cleanupConfig.retentionDays} days)`);
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * 加载所有环境的所有节点健康检查
 */
async function loadAllHealthChecks(): Promise<void> {
  try {
    logger.info('Loading health checks for all nodes...');
    
    // 查询所有配置了健康检查的节点
    const nodesWithHealthCheck = query(
      `SELECT n.id, n.environment_id, n.label, np.health_check
       FROM nodes n
       INNER JOIN node_properties np ON n.id = np.node_id
       WHERE np.health_check IS NOT NULL AND np.health_check != ''`
    );
    
    if (nodesWithHealthCheck.length === 0) {
      logger.warn('No nodes with health check configuration found');
      return;
    }
    
    logger.info(`Found ${nodesWithHealthCheck.length} nodes with health check configuration`);
    
    let registeredCount = 0;
    let failedCount = 0;
    
    // 为每个节点注册健康检查
    for (const node of nodesWithHealthCheck) {
      try {
        const healthCheckConfig = JSON.parse(node.health_check);
        
        // 验证配置是否有效
        if (!healthCheckConfig.type) {
          logger.warn(`Invalid health check config for node ${node.label} (${node.id}): missing type`);
          failedCount++;
          continue;
        }
        
        // 为缺少的字段添加默认值
        const configWithDefaults = {
          type: healthCheckConfig.type,
          interval: healthCheckConfig.interval || 30,  // 默认30秒
          timeout: healthCheckConfig.timeout || 5,     // 默认5秒超时
          retries: healthCheckConfig.retries || 3,     // 默认重试3次
          endpoint: healthCheckConfig.endpoint,
          host: healthCheckConfig.host,
          port: healthCheckConfig.port,
          script: healthCheckConfig.script,
          expectedStatus: healthCheckConfig.expectedStatus || 200
        };
        
        // 注册健康检查
        healthCheckScheduler.registerCheck(node, configWithDefaults);
        registeredCount++;
        
        logger.info(`  ✓ Registered health check for ${node.label} (${node.id})`);
        logger.debug(`    Type: ${configWithDefaults.type}, Interval: ${configWithDefaults.interval}s`);
      } catch (error: any) {
        logger.error(`  ✗ Failed to register health check for node ${node.id}:`, error.message);
        failedCount++;
      }
    }
    
    logger.info(`Health checks loaded: ${registeredCount} registered, ${failedCount} failed`);
    
    // 立即执行一次所有健康检查，获取初始状态
    logger.info('Executing initial health checks...');
    const initialCheckPromises = nodesWithHealthCheck.map(async (node) => {
      try {
        const result = await healthCheckScheduler.executeCheck(node);
        
        // 广播初始状态
        webSocketService.broadcastStateUpdate(node.environment_id, node.id, {
          status: result.status,
          lastCheckTime: result.timestamp,
          message: result.message
        });
        
        return { nodeId: node.id, success: true };
      } catch (error: any) {
        logger.error(`Initial health check failed for node ${node.id}:`, error.message);
        return { nodeId: node.id, success: false };
      }
    });
    
    const initialCheckResults = await Promise.all(initialCheckPromises);
    const successCount = initialCheckResults.filter(r => r.success).length;
    
    logger.info(`Initial health checks completed: ${successCount}/${nodesWithHealthCheck.length} successful`);
  } catch (error: any) {
    logger.error('Failed to load health checks:', error);
  }
}

/**
 * 加载所有环境的所有节点指标采集配置
 */
async function loadAllMetricsCollections(): Promise<void> {
  try {
    logger.info('Loading metrics collections for all nodes...');

    // 查询所有配置了指标采集的节点
    const nodesWithMetrics = query(
      `SELECT n.id, n.environment_id, n.label, np.metrics
       FROM nodes n
       INNER JOIN node_properties np ON n.id = np.node_id
       WHERE np.metrics IS NOT NULL AND np.metrics != ''`
    );

    if (nodesWithMetrics.length === 0) {
      logger.warn('No nodes with metrics configuration found');
      return;
    }

    logger.info(`Found ${nodesWithMetrics.length} nodes with metrics configuration`);

    let registeredCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // 为每个节点注册指标采集
    for (const node of nodesWithMetrics) {
      try {
        const metricsConfig = JSON.parse(node.metrics);

        // 只处理 Pull 模式
        if (metricsConfig.collectionMode !== 'pull') {
          logger.debug(`  - Skipped ${node.label} (${node.id}): mode=${metricsConfig.collectionMode}`);
          skippedCount++;
          continue;
        }

        // 验证配置是否有效
        if (!metricsConfig.endpoint || !metricsConfig.interval) {
          logger.warn(`Invalid metrics config for node ${node.label} (${node.id}): missing endpoint or interval`);
          failedCount++;
          continue;
        }

        // 注册指标采集
        metricsScheduler.registerMetricsCollection(node.id, metricsConfig);
        registeredCount++;

        logger.info(`  ✓ Registered metrics collection for ${node.label} (${node.id})`);
        logger.debug(`    Endpoint: ${metricsConfig.endpoint}, Interval: ${metricsConfig.interval}s`);
      } catch (error: any) {
        logger.error(`  ✗ Failed to register metrics collection for node ${node.id}:`, error.message);
        failedCount++;
      }
    }

    logger.info(`Metrics collections loaded: ${registeredCount} registered, ${skippedCount} skipped (non-pull mode), ${failedCount} failed`);
  } catch (error: any) {
    logger.error('Failed to load metrics collections:', error);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  healthCheckScheduler.stop();
  metricsScheduler.stop();
  dataPushScheduler.stop();
  dataCleanupScheduler.stop();
  webSocketService.stop();
  closeDatabase();
  process.exit(0);
});

// Only start the server if this is the main module
if (require.main === module) {
  start();
}

export default app;
