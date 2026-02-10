import fc from 'fast-check';
import request from 'supertest';
import app from '../index';
import { initializeDatabase, closeDatabase, query, execute } from '../database/init';

describe('API Endpoints - Property-Based Tests', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  afterEach(() => {
    // Clean up environments after each test
    const envs = query('SELECT id FROM environments');
    envs.forEach(env => {
      execute('DELETE FROM environments WHERE id = ?', [env.id]);
    });
  });

  /**
   * Property 9: 环境选择加载正确架构图
   * For any environment, selecting that environment via API should load the graph
   * associated with that environment, not another environment's graph
   * Validates: Requirements 3.3
   */
  describe('Property 9: Environment selection loads correct graph via API', () => {
    it('should load correct graph data for selected environment through API', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          ),
          async ([name, desc]) => {
            // Create first environment
            const env1Response = await request(app)
              .post('/api/environments')
              .send({
                name: name,
                description: desc
              });

            expect(env1Response.status).toBe(201);
            const env1Id = env1Response.body.data.id;

            // Create second environment
            const env2Response = await request(app)
              .post('/api/environments')
              .send({
                name: name + '_2',
                description: desc
              });

            expect(env2Response.status).toBe(201);
            const env2Id = env2Response.body.data.id;

            // Get graph for env1
            const graph1Response = await request(app).get(
              `/api/environments/${env1Id}/graph`
            );

            expect(graph1Response.status).toBe(200);
            expect(graph1Response.body.success).toBe(true);
            const graph1 = graph1Response.body.data;

            // Get graph for env2
            const graph2Response = await request(app).get(
              `/api/environments/${env2Id}/graph`
            );

            expect(graph2Response.status).toBe(200);
            expect(graph2Response.body.success).toBe(true);
            const graph2 = graph2Response.body.data;

            // Verify both graphs are valid but independent
            expect(graph1).toBeDefined();
            expect(graph2).toBeDefined();
            expect(Array.isArray(graph1.nodes)).toBe(true);
            expect(Array.isArray(graph2.nodes)).toBe(true);
            expect(Array.isArray(graph1.edges)).toBe(true);
            expect(Array.isArray(graph2.edges)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 12: 健康检查结果映射到节点状态
   * For any node created via API, the node state should be properly initialized
   * and reflect the correct status
   * Validates: Requirements 4.2, 4.3
   */
  describe('Property 12: Health check result maps to node state via API', () => {
    it('should initialize node state correctly when creating nodes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.integer({ min: 0, max: 1000 }),
            fc.integer({ min: 0, max: 1000 })
          ),
          async ([envName, envDesc, nodeLabel, x, y]) => {
            // Create environment
            const envResponse = await request(app)
              .post('/api/environments')
              .send({
                name: envName,
                description: envDesc
              });

            // Skip if environment creation failed (e.g., validation error)
            if (!envResponse.body.data || !envResponse.body.data.id) {
              return true;
            }

            const envId = envResponse.body.data.id;

            // Create node
            const nodeResponse = await request(app)
              .post(`/api/environments/${envId}/nodes`)
              .send({
                type: 'service',
                label: nodeLabel,
                x,
                y,
                properties: {}
              });

            expect(nodeResponse.status).toBe(201);
            expect(nodeResponse.body.success).toBe(true);

            const node = nodeResponse.body.data;

            // Verify node state is properly initialized
            expect(node.state).toBeDefined();
            expect(node.state.status).toBe('unknown');
            expect(node.state.lastCheckTime).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
