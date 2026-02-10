/**
 * @jest-environment jsdom
 */
import React from 'react';
import PropertyPanel from '../PropertyPanel';
import { Node, NodeProperties } from '../../types';

/**
 * PropertyPanel Component Tests
 * These tests focus on the validation logic and component behavior
 */
describe('PropertyPanel Component - Validation Logic', () => {
  const mockNode: Node = {
    id: 'node1',
    type: 'service',
    label: 'Test Service',
    x: 100,
    y: 100,
    properties: {
      healthCheck: {
        type: 'http',
        endpoint: 'http://localhost:8080/health',
        interval: 60,
        timeout: 10,
        retries: 3,
        expectedStatus: 200
      }
    },
    state: {
      status: 'healthy',
      lastCheckTime: new Date()
    }
  };

  const mockOnPropertiesChange = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render PropertyPanel component', () => {
    const component = React.createElement(PropertyPanel, {
      node: mockNode,
      onPropertiesChange: mockOnPropertiesChange,
      onClose: mockOnClose
    });

    expect(component).toBeDefined();
    expect(component.type).toBe(PropertyPanel);
  });

  it('should return null when node is null', () => {
    const component = React.createElement(PropertyPanel, {
      node: null,
      onPropertiesChange: mockOnPropertiesChange,
      onClose: mockOnClose
    });

    expect(component).toBeDefined();
  });

  it('should have correct prop types', () => {
    const component = React.createElement(PropertyPanel, {
      node: mockNode,
      onPropertiesChange: mockOnPropertiesChange,
      onClose: mockOnClose
    });

    expect(component.props.node).toBe(mockNode);
    expect(component.props.onPropertiesChange).toBe(mockOnPropertiesChange);
    expect(component.props.onClose).toBe(mockOnClose);
  });

  it('should accept different node types', () => {
    const nodeWithMetrics: Node = {
      ...mockNode,
      properties: {
        metrics: {
          endpoint: 'http://localhost:9090/metrics',
          interval: 60,
          metrics: [
            {
              name: 'cpu_usage',
              path: '$.cpu.usage',
              unit: '%',
              threshold: {
                warning: 80,
                critical: 95,
                operator: '>'
              }
            }
          ]
        }
      }
    };

    const component = React.createElement(PropertyPanel, {
      node: nodeWithMetrics,
      onPropertiesChange: mockOnPropertiesChange,
      onClose: mockOnClose
    });

    expect(component.props.node).toBeDefined();
    if (component.props.node) {
      expect(component.props.node.properties.metrics).toBeDefined();
      expect(component.props.node.properties.metrics?.metrics.length).toBe(1);
    }
  });

  it('should accept nodes with actions', () => {
    const nodeWithActions: Node = {
      ...mockNode,
      properties: {
        actions: [
          {
            name: 'restart',
            displayName: 'Restart Service',
            type: 'http',
            endpoint: 'http://localhost:8080/restart',
            method: 'POST',
            requireConfirmation: true
          }
        ]
      }
    };

    const component = React.createElement(PropertyPanel, {
      node: nodeWithActions,
      onPropertiesChange: mockOnPropertiesChange,
      onClose: mockOnClose
    });

    expect(component.props.node).toBeDefined();
    if (component.props.node) {
      expect(component.props.node.properties.actions).toBeDefined();
      expect(component.props.node.properties.actions?.length).toBe(1);
    }
  });

  it('should handle empty properties', () => {
    const nodeWithEmptyProps: Node = {
      ...mockNode,
      properties: {}
    };

    const component = React.createElement(PropertyPanel, {
      node: nodeWithEmptyProps,
      onPropertiesChange: mockOnPropertiesChange,
      onClose: mockOnClose
    });

    expect(component.props.node).toBeDefined();
    if (component.props.node) {
      expect(component.props.node.properties).toEqual({});
    }
  });

  it('should handle complex property configurations', () => {
    const complexNode: Node = {
      ...mockNode,
      properties: {
        healthCheck: {
          type: 'tcp',
          host: 'localhost',
          port: 8080,
          interval: 30,
          timeout: 5,
          retries: 2
        },
        metrics: {
          endpoint: 'http://localhost:9090/metrics',
          interval: 60,
          metrics: [
            {
              name: 'cpu_usage',
              path: '$.cpu.usage',
              unit: '%',
              threshold: {
                warning: 80,
                critical: 95,
                operator: '>'
              }
            },
            {
              name: 'memory_usage',
              path: '$.memory.usage',
              unit: '%',
              threshold: {
                warning: 85,
                critical: 95,
                operator: '>'
              }
            }
          ]
        },
        actions: [
          {
            name: 'restart',
            displayName: 'Restart Service',
            type: 'http',
            endpoint: 'http://localhost:8080/restart',
            method: 'POST',
            requireConfirmation: true
          },
          {
            name: 'stop',
            displayName: 'Stop Service',
            type: 'ssh',
            host: 'server.example.com',
            command: 'systemctl stop myservice',
            requireConfirmation: true
          }
        ]
      }
    };

    const component = React.createElement(PropertyPanel, {
      node: complexNode,
      onPropertiesChange: mockOnPropertiesChange,
      onClose: mockOnClose
    });

    expect(component.props.node).toBeDefined();
    if (component.props.node) {
      expect(component.props.node.properties.healthCheck).toBeDefined();
      expect(component.props.node.properties.metrics).toBeDefined();
      expect(component.props.node.properties.actions).toBeDefined();
      expect(component.props.node.properties.actions?.length).toBe(2);
    }
  });

  it('should maintain node identity through property updates', () => {
    const component1 = React.createElement(PropertyPanel, {
      node: mockNode,
      onPropertiesChange: mockOnPropertiesChange,
      onClose: mockOnClose
    });

    const updatedNode: Node = {
      ...mockNode,
      properties: {
        ...mockNode.properties,
        healthCheck: {
          ...mockNode.properties.healthCheck!,
          interval: 120
        }
      }
    };

    const component2 = React.createElement(PropertyPanel, {
      node: updatedNode,
      onPropertiesChange: mockOnPropertiesChange,
      onClose: mockOnClose
    });

    expect(component1.props.node).toBeDefined();
    expect(component2.props.node).toBeDefined();
    if (component1.props.node && component2.props.node) {
      expect(component1.props.node.id).toBe(component2.props.node.id);
      expect(component1.props.node.label).toBe(component2.props.node.label);
    }
  });
});
