import { EnvironmentManager } from '../EnvironmentManager';
import { initializeDatabase, closeDatabase, query, execute } from '../../database/init';

describe('EnvironmentManager', () => {
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

  describe('createEnvironment', () => {
    it('should create a new environment with valid name and description', async () => {
      const env = await manager.createEnvironment('Dev', 'Development environment');

      expect(env).toBeDefined();
      expect(env.id).toBeDefined();
      expect(env.name).toBe('Dev');
      expect(env.description).toBe('Development environment');
      expect(env.createdAt).toBeInstanceOf(Date);
      expect(env.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when name is missing', async () => {
      await expect(manager.createEnvironment('', 'Description')).rejects.toThrow(
        'Environment name and description are required'
      );
    });

    it('should throw error when description is missing', async () => {
      await expect(manager.createEnvironment('Dev', '')).rejects.toThrow(
        'Environment name and description are required'
      );
    });

    it('should create empty graph data for new environment', async () => {
      const env = await manager.createEnvironment('Test', 'Test environment');

      const graphResults = query(
        'SELECT data FROM graph_data WHERE environment_id = ?',
        [env.id]
      );

      expect(graphResults.length).toBe(1);
      const graphData = JSON.parse(graphResults[0].data);
      expect(graphData.nodes).toEqual([]);
      expect(graphData.edges).toEqual([]);
    });
  });

  describe('getEnvironment', () => {
    it('should retrieve an existing environment', async () => {
      const created = await manager.createEnvironment('Prod', 'Production environment');
      const retrieved = await manager.getEnvironment(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Prod');
      expect(retrieved?.description).toBe('Production environment');
    });

    it('should return null for non-existent environment', async () => {
      const result = await manager.getEnvironment('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('listEnvironments', () => {
    it('should return empty list when no environments exist', async () => {
      const envs = await manager.listEnvironments();
      expect(envs).toEqual([]);
    });

    it('should return all created environments', async () => {
      await manager.createEnvironment('Dev', 'Development');
      await manager.createEnvironment('Staging', 'Staging');
      await manager.createEnvironment('Prod', 'Production');

      const envs = await manager.listEnvironments();

      expect(envs.length).toBe(3);
      expect(envs.map(e => e.name)).toContain('Dev');
      expect(envs.map(e => e.name)).toContain('Staging');
      expect(envs.map(e => e.name)).toContain('Prod');
    });

    it('should return environments ordered by creation time (newest first)', async () => {
      const env1 = await manager.createEnvironment('First', 'First env');
      const env2 = await manager.createEnvironment('Second', 'Second env');
      const env3 = await manager.createEnvironment('Third', 'Third env');

      const envs = await manager.listEnvironments();

      expect(envs[0].id).toBe(env3.id);
      expect(envs[1].id).toBe(env2.id);
      expect(envs[2].id).toBe(env1.id);
    });
  });

  describe('updateEnvironment', () => {
    it('should update environment name and description', async () => {
      const created = await manager.createEnvironment('Old', 'Old description');
      const updated = await manager.updateEnvironment(created.id, {
        name: 'New',
        description: 'New description'
      });

      expect(updated.name).toBe('New');
      expect(updated.description).toBe('New description');
      expect(updated.id).toBe(created.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should throw error when environment does not exist', async () => {
      await expect(
        manager.updateEnvironment('non-existent-id', { name: 'New' })
      ).rejects.toThrow('Environment with id non-existent-id not found');
    });

    it('should preserve unchanged fields', async () => {
      const created = await manager.createEnvironment('Dev', 'Development');
      const updated = await manager.updateEnvironment(created.id, {
        name: 'Development'
      });

      expect(updated.description).toBe('Development');
    });
  });

  describe('deleteEnvironment', () => {
    it('should delete an existing environment', async () => {
      const env = await manager.createEnvironment('ToDelete', 'To be deleted');
      await manager.deleteEnvironment(env.id);

      const retrieved = await manager.getEnvironment(env.id);
      expect(retrieved).toBeNull();
    });

    it('should throw error when environment does not exist', async () => {
      await expect(manager.deleteEnvironment('non-existent-id')).rejects.toThrow(
        'Environment with id non-existent-id not found'
      );
    });

    it('should cascade delete related graph data', async () => {
      const env = await manager.createEnvironment('ToDelete', 'To be deleted');
      
      // Verify graph data exists
      let graphResults = query(
        'SELECT id FROM graph_data WHERE environment_id = ?',
        [env.id]
      );
      expect(graphResults.length).toBe(1);

      // Delete environment
      await manager.deleteEnvironment(env.id);

      // Verify environment is deleted
      const deletedEnv = await manager.getEnvironment(env.id);
      expect(deletedEnv).toBeNull();
    });
  });

  describe('cloneEnvironment', () => {
    it('should create a clone of an existing environment', async () => {
      const source = await manager.createEnvironment('Source', 'Source environment');
      const cloned = await manager.cloneEnvironment(source.id, 'Cloned');

      expect(cloned.id).not.toBe(source.id);
      expect(cloned.name).toBe('Cloned');
      expect(cloned.description).toBe('Source environment');
    });

    it('should throw error when source environment does not exist', async () => {
      await expect(
        manager.cloneEnvironment('non-existent-id', 'Cloned')
      ).rejects.toThrow('Source environment with id non-existent-id not found');
    });

    it('should throw error when new name already exists', async () => {
      const source = await manager.createEnvironment('Source', 'Source');
      await manager.createEnvironment('Existing', 'Existing');

      await expect(
        manager.cloneEnvironment(source.id, 'Existing')
      ).rejects.toThrow('Environment with name Existing already exists');
    });

    it('should copy graph data from source environment', async () => {
      const source = await manager.createEnvironment('Source', 'Source');
      
      // Add some graph data to source
      const graphId = query(
        'SELECT id FROM graph_data WHERE environment_id = ?',
        [source.id]
      )[0].id;

      const testGraphData = JSON.stringify({
        nodes: [{ id: 'node1', label: 'Test Node' }],
        edges: []
      });

      execute(
        'UPDATE graph_data SET data = ? WHERE id = ?',
        [testGraphData, graphId]
      );

      // Clone environment
      const cloned = await manager.cloneEnvironment(source.id, 'Cloned');

      // Verify graph data is copied
      const clonedGraphResults = query(
        'SELECT data FROM graph_data WHERE environment_id = ?',
        [cloned.id]
      );

      expect(clonedGraphResults.length).toBe(1);
      const clonedGraphData = JSON.parse(clonedGraphResults[0].data);
      expect(clonedGraphData.nodes).toEqual([{ id: 'node1', label: 'Test Node' }]);
    });

    it('should maintain data isolation between cloned environments', async () => {
      const source = await manager.createEnvironment('Source', 'Source environment');
      const cloned = await manager.cloneEnvironment(source.id, 'Cloned');

      // Update source environment
      await manager.updateEnvironment(source.id, {
        description: 'Updated source'
      });

      // Verify cloned environment is not affected
      const clonedEnv = await manager.getEnvironment(cloned.id);
      expect(clonedEnv?.description).toBe('Source environment');
      
      // Verify source was updated
      const sourceEnv = await manager.getEnvironment(source.id);
      expect(sourceEnv?.description).toBe('Updated source');
    });
  });
});
