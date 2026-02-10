import request from 'supertest';
import app from '../index';
import { initializeDatabase, closeDatabase } from '../database/init';

describe('API Endpoints', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Environment Management', () => {
    let envId: string;

    it('should create an environment', async () => {
      const response = await request(app)
        .post('/api/environments')
        .send({
          name: 'Test Environment',
          description: 'A test environment'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Environment');
      expect(response.body.data.description).toBe('A test environment');
      envId = response.body.data.id;
    });

    it('should get all environments', async () => {
      const response = await request(app).get('/api/environments');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get a single environment', async () => {
      const response = await request(app).get(`/api/environments/${envId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(envId);
    });

    it('should update an environment', async () => {
      const response = await request(app)
        .put(`/api/environments/${envId}`)
        .send({
          name: 'Updated Environment',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Environment');
    });

    it('should return 404 for non-existent environment', async () => {
      const response = await request(app).get('/api/environments/non-existent-id');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should delete an environment', async () => {
      const response = await request(app).delete(`/api/environments/${envId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Graph Management', () => {
    let envId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/environments')
        .send({
          name: `Graph Test Env ${Date.now()}`,
          description: 'For graph testing'
        });
      envId = response.body.data.id;
    });

    it('should get graph data for an environment', async () => {
      const response = await request(app).get(`/api/environments/${envId}/graph`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nodes).toEqual([]);
      expect(response.body.data.edges).toEqual([]);
    });

    it('should update graph data', async () => {
      const graphData = {
        nodes: [
          {
            id: 'node1',
            type: 'service',
            label: 'Service 1',
            x: 100,
            y: 100,
            properties: {},
            state: { status: 'healthy', lastCheckTime: new Date() }
          }
        ],
        edges: [],
        layout: {}
      };

      const response = await request(app)
        .put(`/api/environments/${envId}/graph`)
        .send(graphData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nodes.length).toBe(1);
    });

    it('should reject invalid graph data', async () => {
      const invalidGraphData = {
        nodes: [
          {
            id: 'node1',
            type: 'service',
            label: 'Service 1',
            x: 'invalid', // Should be a number
            y: 100,
            properties: {},
            state: { status: 'healthy', lastCheckTime: new Date() }
          }
        ],
        edges: []
      };

      const response = await request(app)
        .put(`/api/environments/${envId}/graph`)
        .send(invalidGraphData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Node Management', () => {
    let envId: string;
    let nodeId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/environments')
        .send({
          name: `Node Test Env ${Date.now()}`,
          description: 'For node testing'
        });
      envId = response.body.data.id;
    });

    it('should create a node', async () => {
      const response = await request(app)
        .post(`/api/environments/${envId}/nodes`)
        .send({
          type: 'service',
          label: 'Test Service',
          x: 100,
          y: 100,
          properties: {}
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.label).toBe('Test Service');
      nodeId = response.body.data.id;
    });

    it('should reject node creation with missing required fields', async () => {
      const response = await request(app)
        .post(`/api/environments/${envId}/nodes`)
        .send({
          type: 'service',
          label: 'Test Service'
          // Missing x and y
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should update a node', async () => {
      // First create a node
      const createResponse = await request(app)
        .post(`/api/environments/${envId}/nodes`)
        .send({
          type: 'service',
          label: 'Original Label',
          x: 100,
          y: 100,
          properties: {}
        });

      const nodeId = createResponse.body.data.id;

      // Then update it
      const updateResponse = await request(app)
        .put(`/api/environments/${envId}/nodes/${nodeId}`)
        .send({
          type: 'service',
          label: 'Updated Label',
          x: 200,
          y: 200,
          properties: {}
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.label).toBe('Updated Label');
    });

    it('should delete a node', async () => {
      // First create a node
      const createResponse = await request(app)
        .post(`/api/environments/${envId}/nodes`)
        .send({
          type: 'service',
          label: 'To Delete',
          x: 100,
          y: 100,
          properties: {}
        });

      const nodeId = createResponse.body.data.id;

      // Then delete it
      const deleteResponse = await request(app).delete(
        `/api/environments/${envId}/nodes/${nodeId}`
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });

    it('should return 404 for non-existent node', async () => {
      const response = await request(app).put(
        `/api/environments/${envId}/nodes/non-existent-id`
      );
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Metrics Data Management', () => {
    let envId: string;
    let nodeId: string;

    beforeAll(async () => {
      // 创建测试环境
      const envResponse = await request(app)
        .post('/api/environments')
        .send({
          name: 'Metrics Test Env',
          description: 'Environment for metrics testing'
        });
      envId = envResponse.body.data.id;

      // 创建测试节点
      const nodeResponse = await request(app)
        .post(`/api/environments/${envId}/nodes`)
        .send({
          type: 'service',
          label: 'Metrics Test Node',
          x: 100,
          y: 100,
          properties: {
            metrics: {
              endpoint: 'http://example.com/metrics',
              interval: 60,
              metrics: [
                {
                  name: 'cpu_usage',
                  path: 'cpu.usage',
                  unit: '%'
                }
              ]
            }
          }
        });
      nodeId = nodeResponse.body.data.id;
    });

    it('应该获取节点的最新指标数据', async () => {
      const response = await request(app).get(
        `/api/nodes/${nodeId}/metrics/latest`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该获取节点的指标历史数据', async () => {
      const response = await request(app).get(
        `/api/nodes/${nodeId}/metrics/history`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该支持按指标名称过滤历史数据', async () => {
      const response = await request(app).get(
        `/api/nodes/${nodeId}/metrics/history?metricName=cpu_usage`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('应该支持时间范围查询', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 3600000).toISOString();
      const endTime = now.toISOString();

      const response = await request(app).get(
        `/api/nodes/${nodeId}/metrics/history?startTime=${startTime}&endTime=${endTime}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('应该在节点不存在时返回404', async () => {
      const response = await request(app).get(
        '/api/nodes/non-existent-id/metrics/latest'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Actions Execution', () => {
    let envId: string;
    let nodeId: string;

    beforeAll(async () => {
      // 创建测试环境
      const envResponse = await request(app)
        .post('/api/environments')
        .send({
          name: 'Actions Test Environment',
          description: 'Environment for testing actions'
        });
      envId = envResponse.body.data.id;

      // 创建测试节点
      const nodeResponse = await request(app)
        .post(`/api/environments/${envId}/nodes`)
        .send({
          type: 'service',
          label: 'Test Service',
          x: 100,
          y: 100
        });
      nodeId = nodeResponse.body.data.id;

      // 配置节点操作
      await request(app)
        .put(`/api/environments/${envId}/nodes/${nodeId}`)
        .send({
          properties: {
            actions: [
              {
                name: 'restart',
                displayName: 'Restart Service',
                type: 'ssh',
                host: 'server.example.com',
                command: 'systemctl restart myservice',
                requireConfirmation: true
              },
              {
                name: 'stop',
                displayName: 'Stop Service',
                type: 'script',
                command: '/scripts/stop.sh',
                requireConfirmation: false
              }
            ]
          }
        });
    });

    it('should execute an action', async () => {
      const response = await request(app)
        .post(`/api/nodes/${nodeId}/actions/restart`);

      if (response.status !== 200) {
        console.log('Action execution failed:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.message).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should return 404 for non-existent node', async () => {
      const response = await request(app)
        .post('/api/nodes/non-existent-node/actions/restart');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent action', async () => {
      const response = await request(app)
        .post(`/api/nodes/${nodeId}/actions/non-existent-action`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should get action history for a node', async () => {
      // 先执行一个操作
      await request(app)
        .post(`/api/nodes/${nodeId}/actions/restart`);

      // 获取历史
      const response = await request(app)
        .get(`/api/nodes/${nodeId}/actions/history`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].nodeId).toBe(nodeId);
      expect(response.body.data[0].action).toBeDefined();
    });

    it('should limit action history results', async () => {
      const response = await request(app)
        .get(`/api/nodes/${nodeId}/actions/history?limit=1`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should get all action history', async () => {
      const response = await request(app)
        .get('/api/actions/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should execute multiple actions and track them', async () => {
      // 执行多个操作
      await request(app)
        .post(`/api/nodes/${nodeId}/actions/restart`);
      await request(app)
        .post(`/api/nodes/${nodeId}/actions/stop`);

      // 获取历史
      const response = await request(app)
        .get(`/api/nodes/${nodeId}/actions/history`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      const actions = response.body.data.map((log: any) => log.action);
      expect(actions).toContain('restart');
      expect(actions).toContain('stop');
    });
  });
});
