import {
  GraphDataModel,
  NodeModel,
  EdgeModel,
  NodeStateModel,
  HealthCheckConfigModel,
  MetricsConfigModel,
  ActionConfigModel
} from '../GraphDataModel';

describe('GraphDataModel', () => {
  describe('validate', () => {
    it('should validate valid graph data', () => {
      const validData = {
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
        edges: [
          {
            id: 'edge1',
            source: 'node1',
            target: 'node2',
            label: 'calls'
          }
        ],
        layout: {}
      };

      const result = GraphDataModel.validate(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject null graph data', () => {
      const result = GraphDataModel.validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject data with invalid nodes array', () => {
      const result = GraphDataModel.validate({
        nodes: 'not an array',
        edges: []
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nodes must be an array'))).toBe(true);
    });

    it('should reject data with invalid edges array', () => {
      const result = GraphDataModel.validate({
        nodes: [],
        edges: 'not an array'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('edges must be an array'))).toBe(true);
    });
  });

  describe('serialize and deserialize', () => {
    it('should serialize valid graph data to JSON', () => {
      const data = {
        nodes: [],
        edges: [],
        layout: {}
      };

      const json = GraphDataModel.serialize(data);
      expect(typeof json).toBe('string');
      expect(JSON.parse(json)).toEqual(data);
    });

    it('should deserialize JSON to graph data', () => {
      const original = {
        nodes: [
          {
            id: 'node1',
            type: 'service',
            label: 'Service 1',
            x: 100,
            y: 100,
            properties: {},
            state: { status: 'healthy', lastCheckTime: new Date().toISOString() }
          }
        ],
        edges: [],
        layout: {}
      };

      const json = JSON.stringify(original);
      const deserialized = GraphDataModel.deserialize(json);

      expect(deserialized.nodes.length).toBe(1);
      expect(deserialized.nodes[0].id).toBe('node1');
    });

    it('should throw error on invalid JSON', () => {
      expect(() => {
        GraphDataModel.deserialize('invalid json');
      }).toThrow('Invalid JSON');
    });

    it('should throw error on invalid graph data during deserialization', () => {
      const invalidJson = JSON.stringify({
        nodes: 'not an array',
        edges: []
      });

      expect(() => {
        GraphDataModel.deserialize(invalidJson);
      }).toThrow('Invalid graph data');
    });
  });

  describe('createEmpty', () => {
    it('should create empty graph data', () => {
      const empty = GraphDataModel.createEmpty();

      expect(empty.nodes).toEqual([]);
      expect(empty.edges).toEqual([]);
      expect(empty.layout).toEqual({});
    });
  });
});

describe('NodeModel', () => {
  describe('validate', () => {
    it('should validate valid node', () => {
      const validNode = {
        id: 'node1',
        type: 'service',
        label: 'Service 1',
        x: 100,
        y: 200,
        properties: {},
        state: { status: 'healthy', lastCheckTime: new Date() }
      };

      const result = NodeModel.validate(validNode);
      expect(result.valid).toBe(true);
    });

    it('should reject node with empty id', () => {
      const result = NodeModel.validate({
        id: '',
        type: 'service',
        label: 'Service 1',
        x: 100,
        y: 200
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id must be'))).toBe(true);
    });

    it('should reject node with invalid x coordinate', () => {
      const result = NodeModel.validate({
        id: 'node1',
        type: 'service',
        label: 'Service 1',
        x: 'not a number',
        y: 200
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('x must be'))).toBe(true);
    });

    it('should reject node with invalid y coordinate', () => {
      const result = NodeModel.validate({
        id: 'node1',
        type: 'service',
        label: 'Service 1',
        x: 100,
        y: NaN
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('y must be'))).toBe(true);
    });
  });
});

describe('EdgeModel', () => {
  describe('validate', () => {
    it('should validate valid edge', () => {
      const validEdge = {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        label: 'calls'
      };

      const result = EdgeModel.validate(validEdge);
      expect(result.valid).toBe(true);
    });

    it('should reject edge with empty source', () => {
      const result = EdgeModel.validate({
        id: 'edge1',
        source: '',
        target: 'node2'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('source must be'))).toBe(true);
    });

    it('should reject edge with empty target', () => {
      const result = EdgeModel.validate({
        id: 'edge1',
        source: 'node1',
        target: ''
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('target must be'))).toBe(true);
    });
  });
});

describe('HealthCheckConfigModel', () => {
  describe('validate', () => {
    it('should validate valid HTTP health check config', () => {
      const config = {
        type: 'http',
        endpoint: 'http://localhost:8080/health',
        interval: 30,
        timeout: 5,
        retries: 3
      };

      const result = HealthCheckConfigModel.validate(config);
      expect(result.valid).toBe(true);
    });

    it('should reject HTTP config without endpoint', () => {
      const config = {
        type: 'http',
        interval: 30,
        timeout: 5,
        retries: 3
      };

      const result = HealthCheckConfigModel.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('endpoint is required'))).toBe(true);
    });

    it('should validate valid TCP health check config', () => {
      const config = {
        type: 'tcp',
        host: 'localhost',
        port: 8080,
        interval: 30,
        timeout: 5,
        retries: 3
      };

      const result = HealthCheckConfigModel.validate(config);
      expect(result.valid).toBe(true);
    });

    it('should reject TCP config with invalid port', () => {
      const config = {
        type: 'tcp',
        host: 'localhost',
        port: 99999,
        interval: 30,
        timeout: 5,
        retries: 3
      };

      const result = HealthCheckConfigModel.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('port must be'))).toBe(true);
    });

    it('should reject config with negative interval', () => {
      const config = {
        type: 'http',
        endpoint: 'http://localhost:8080/health',
        interval: -1,
        timeout: 5,
        retries: 3
      };

      const result = HealthCheckConfigModel.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('interval must be'))).toBe(true);
    });

    it('should reject config with negative timeout', () => {
      const config = {
        type: 'http',
        endpoint: 'http://localhost:8080/health',
        interval: 30,
        timeout: -1,
        retries: 3
      };

      const result = HealthCheckConfigModel.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('timeout must be'))).toBe(true);
    });

    it('should reject config with negative retries', () => {
      const config = {
        type: 'http',
        endpoint: 'http://localhost:8080/health',
        interval: 30,
        timeout: 5,
        retries: -1
      };

      const result = HealthCheckConfigModel.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('retries must be'))).toBe(true);
    });
  });
});

describe('ActionConfigModel', () => {
  describe('validate', () => {
    it('should validate valid HTTP action config', () => {
      const config = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'http',
        endpoint: 'http://localhost:8080/restart',
        method: 'POST',
        requireConfirmation: true
      };

      const result = ActionConfigModel.validate(config);
      expect(result.valid).toBe(true);
    });

    it('should validate valid SSH action config', () => {
      const config = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'ssh',
        host: 'server.example.com',
        command: 'systemctl restart myservice',
        requireConfirmation: true
      };

      const result = ActionConfigModel.validate(config);
      expect(result.valid).toBe(true);
    });

    it('should reject HTTP action without endpoint', () => {
      const config = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'http',
        requireConfirmation: true
      };

      const result = ActionConfigModel.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('endpoint is required'))).toBe(true);
    });

    it('should reject SSH action without host', () => {
      const config = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'ssh',
        command: 'systemctl restart myservice',
        requireConfirmation: true
      };

      const result = ActionConfigModel.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('host is required'))).toBe(true);
    });

    it('should reject action with non-boolean requireConfirmation', () => {
      const config = {
        name: 'restart',
        displayName: 'Restart Service',
        type: 'http',
        endpoint: 'http://localhost:8080/restart',
        requireConfirmation: 'yes'
      };

      const result = ActionConfigModel.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('requireConfirmation must be'))).toBe(true);
    });
  });
});
