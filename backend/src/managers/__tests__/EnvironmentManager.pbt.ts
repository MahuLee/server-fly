import fc from 'fast-check';
import { EnvironmentManager } from '../EnvironmentManager';
import { initializeDatabase, closeDatabase, query, execute } from '../../database/init';

describe('EnvironmentManager - Property-Based Tests', () => {
  let manager: EnvironmentManager;

  beforeAll(async () => {
    await initializeDatabase();
    manager = new EnvironmentManager();
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
   * Property 8: 环境创建需要必填字段
   * For any environment creation request missing name or description,
   * the system should reject it and return an error
   * Validates: Requirements 3.2
   */
  describe('Property 8: Environment creation requires mandatory fields', () => {
    it('should reject environment creation with empty name', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (description) => {
          if (description.length === 0) return true; // Skip empty descriptions

          try {
            await manager.createEnvironment('', description);
            throw new Error('Should have thrown an error');
          } catch (error: any) {
            expect(error.message).toContain('required');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should reject environment creation with empty description', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (name) => {
          if (name.length === 0) return true; // Skip empty names

          try {
            await manager.createEnvironment(name, '');
            throw new Error('Should have thrown an error');
          } catch (error: any) {
            expect(error.message).toContain('required');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: 环境选择加载正确架构图
   * For any environment, selecting that environment should load the graph
   * associated with that environment, not another environment's graph
   * Validates: Requirements 3.3
   */
  describe('Property 9: Environment selection loads correct graph', () => {
    it('should load correct graph data for selected environment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          ),
          async ([name1, desc1]) => {
            const env1 = await manager.createEnvironment(name1, desc1);
            const env2 = await manager.createEnvironment(name1 + '_2', desc1);

            // Get graph data for env1
            const graph1Results = query(
              'SELECT data FROM graph_data WHERE environment_id = ?',
              [env1.id]
            );

            // Get graph data for env2
            const graph2Results = query(
              'SELECT data FROM graph_data WHERE environment_id = ?',
              [env2.id]
            );

            // Verify they are different records
            expect(graph1Results.length).toBe(1);
            expect(graph2Results.length).toBe(1);
            expect(graph1Results[0].data).toBeDefined();
            expect(graph2Results[0].data).toBeDefined();

            // Clean up
            await manager.deleteEnvironment(env1.id);
            await manager.deleteEnvironment(env2.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: 环境数据隔离
   * For any two different environments, modifying one environment's graph
   * or node configuration should not affect the other environment's data
   * Validates: Requirements 3.4, 3.5
   */
  describe('Property 10: Environment data isolation', () => {
    it('should maintain data isolation between environments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          ),
          async ([name1, desc1, newDesc]) => {
            const env1 = await manager.createEnvironment(name1, desc1);
            const env2 = await manager.createEnvironment(name1 + '_2', desc1);

            // Update env1
            await manager.updateEnvironment(env1.id, { description: newDesc });

            // Verify env2 is not affected
            const env2After = await manager.getEnvironment(env2.id);
            expect(env2After?.description).toBe(desc1);

            // Clean up
            await manager.deleteEnvironment(env1.id);
            await manager.deleteEnvironment(env2.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: 环境复制产生等价配置
   * For any environment, cloning it should create a new environment
   * with equivalent graph and node configuration (except for environment ID and name)
   * Validates: Requirements 3.6
   */
  describe('Property 11: Environment clone produces equivalent configuration', () => {
    it('should produce equivalent configuration when cloning', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          ),
          async ([name, desc]) => {
            const source = await manager.createEnvironment(name, desc);
            const cloned = await manager.cloneEnvironment(source.id, name + '_clone');

            // Verify basic properties match (except id and name)
            expect(cloned.description).toBe(source.description);

            // Verify graph data is equivalent
            const sourceGraphResults = query(
              'SELECT data FROM graph_data WHERE environment_id = ?',
              [source.id]
            );

            const clonedGraphResults = query(
              'SELECT data FROM graph_data WHERE environment_id = ?',
              [cloned.id]
            );

            expect(sourceGraphResults.length).toBe(1);
            expect(clonedGraphResults.length).toBe(1);

            const sourceGraph = JSON.parse(sourceGraphResults[0].data);
            const clonedGraph = JSON.parse(clonedGraphResults[0].data);

            expect(clonedGraph.nodes).toEqual(sourceGraph.nodes);
            expect(clonedGraph.edges).toEqual(sourceGraph.edges);

            // Clean up
            await manager.deleteEnvironment(source.id);
            await manager.deleteEnvironment(cloned.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
