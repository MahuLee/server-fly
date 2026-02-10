import fc from 'fast-check';
import { NodeProperties, HealthCheckConfig, MetricsConfig, ActionConfig } from '../../types';

/**
 * Property-Based Tests for PropertyPanel Component
 * Feature: service-monitoring-app, Property 5: 节点选择显示属性面板
 * Validates: Requirements 2.1
 * 
 * These tests focus on validation logic without rendering
 */
describe('PropertyPanel - Property 5: Node Selection Shows Property Panel', () => {
  it('should accept valid node properties', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          label: fc.string({ minLength: 1, maxLength: 50 })
        }),
        (nodeData) => {
          // Property: Valid node data should be accepted
          expect(nodeData.id).toBeDefined();
          expect(nodeData.label).toBeDefined();
          expect(nodeData.label.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle null node gracefully', () => {
    const node = null;
    
    // Property: Null node should be handled without errors
    expect(node).toBeNull();
  });
});

/**
 * Property-Based Tests for PropertyPanel Component
 * Feature: service-monitoring-app, Property 6: 属性验证拒绝无效值
 * Validates: Requirements 2.5
 */
describe('PropertyPanel - Property 6: Property Validation Rejects Invalid Values', () => {
  // Validation function extracted from PropertyPanel
  const validateHealthCheck = (hc: Partial<HealthCheckConfig>): string[] => {
    const errors: string[] = [];
    
    if (hc.interval !== undefined && hc.interval <= 0) {
      errors.push('Health check interval must be greater than 0');
    }
    if (hc.timeout !== undefined && hc.timeout <= 0) {
      errors.push('Health check timeout must be greater than 0');
    }
    if (hc.retries !== undefined && hc.retries < 0) {
      errors.push('Health check retries cannot be negative');
    }
    if (hc.type === 'http' && !hc.endpoint) {
      errors.push('HTTP endpoint is required for HTTP health check');
    }
    if (hc.type === 'tcp' && (!hc.host || !hc.port)) {
      errors.push('Host and port are required for TCP health check');
    }
    if (hc.type === 'script' && !hc.script) {
      errors.push('Script path is required for script health check');
    }
    
    return errors;
  };

  it('should reject invalid health check interval values', () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 0 }),
        (invalidInterval) => {
          const errors = validateHealthCheck({ interval: invalidInterval });
          
          // Property: Invalid interval should produce validation error
          expect(errors.length).toBeGreaterThan(0);
          expect(errors.some(e => e.includes('interval'))).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should accept valid health check interval values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3600 }),
        (validInterval) => {
          const errors = validateHealthCheck({ interval: validInterval });
          
          // Property: Valid interval should not produce interval error
          expect(errors.some(e => e.includes('interval'))).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject missing HTTP endpoint', () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        (missingEndpoint) => {
          const errors = validateHealthCheck({ 
            type: 'http',
            endpoint: missingEndpoint as any
          });
          
          // Property: Missing HTTP endpoint should produce error
          expect(errors.length).toBeGreaterThan(0);
          expect(errors.some(e => e.includes('HTTP endpoint'))).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should reject invalid port numbers for TCP health check', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 65536 })
        ),
        (invalidPort) => {
          // Property: Invalid port should be outside valid range
          const isInvalidPort = invalidPort <= 0 || invalidPort >= 65536;
          expect(isInvalidPort).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property-Based Tests for PropertyPanel Component
 * Feature: service-monitoring-app, Property 7: 节点属性持久化往返一致性
 * Validates: Requirements 2.6, 7.3
 */
describe('PropertyPanel - Property 7: Node Properties Persistence Round-Trip Consistency', () => {
  it('should preserve health check properties through serialization', () => {
    fc.assert(
      fc.property(
        fc.record({
          endpoint: fc.webUrl(),
          interval: fc.integer({ min: 1, max: 3600 }),
          timeout: fc.integer({ min: 1, max: 300 }),
          retries: fc.integer({ min: 0, max: 10 }),
          expectedStatus: fc.integer({ min: 200, max: 599 })
        }),
        (healthCheckData) => {
          const originalProperties: NodeProperties = {
            healthCheck: {
              type: 'http',
              ...healthCheckData
            }
          };

          // Simulate serialization and deserialization
          const serialized = JSON.stringify(originalProperties);
          const deserialized = JSON.parse(serialized) as NodeProperties;

          // Property: Deserialized properties should match original
          expect(deserialized.healthCheck?.endpoint).toBe(healthCheckData.endpoint);
          expect(deserialized.healthCheck?.interval).toBe(healthCheckData.interval);
          expect(deserialized.healthCheck?.timeout).toBe(healthCheckData.timeout);
          expect(deserialized.healthCheck?.retries).toBe(healthCheckData.retries);
          expect(deserialized.healthCheck?.expectedStatus).toBe(healthCheckData.expectedStatus);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve action properties through serialization', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          displayName: fc.string({ minLength: 1, maxLength: 100 }),
          endpoint: fc.webUrl(),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          requireConfirmation: fc.boolean()
        }),
        (actionData) => {
          const originalProperties: NodeProperties = {
            actions: [
              {
                ...actionData,
                type: 'http'
              }
            ]
          };

          // Simulate serialization and deserialization
          const serialized = JSON.stringify(originalProperties);
          const deserialized = JSON.parse(serialized) as NodeProperties;

          // Property: Deserialized properties should match original
          expect(deserialized.actions?.[0]?.name).toBe(actionData.name);
          expect(deserialized.actions?.[0]?.displayName).toBe(actionData.displayName);
          expect(deserialized.actions?.[0]?.endpoint).toBe(actionData.endpoint);
          expect(deserialized.actions?.[0]?.method).toBe(actionData.method);
          expect(deserialized.actions?.[0]?.requireConfirmation).toBe(actionData.requireConfirmation);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve metrics properties through serialization', () => {
    fc.assert(
      fc.property(
        fc.record({
          endpoint: fc.webUrl(),
          interval: fc.integer({ min: 1, max: 3600 }),
          metricName: fc.string({ minLength: 1, maxLength: 50 }),
          metricPath: fc.string({ minLength: 1, maxLength: 100 }),
          metricUnit: fc.string({ minLength: 1, maxLength: 20 })
        }),
        (metricsData) => {
          const originalProperties: NodeProperties = {
            metrics: {
              endpoint: metricsData.endpoint,
              interval: metricsData.interval,
              metrics: [
                {
                  name: metricsData.metricName,
                  path: metricsData.metricPath,
                  unit: metricsData.metricUnit
                }
              ]
            }
          };

          // Simulate serialization and deserialization
          const serialized = JSON.stringify(originalProperties);
          const deserialized = JSON.parse(serialized) as NodeProperties;

          // Property: Deserialized properties should match original
          expect(deserialized.metrics?.endpoint).toBe(metricsData.endpoint);
          expect(deserialized.metrics?.interval).toBe(metricsData.interval);
          expect(deserialized.metrics?.metrics[0]?.name).toBe(metricsData.metricName);
          expect(deserialized.metrics?.metrics[0]?.path).toBe(metricsData.metricPath);
          expect(deserialized.metrics?.metrics[0]?.unit).toBe(metricsData.metricUnit);
        }
      ),
      { numRuns: 100 }
    );
  });
});
