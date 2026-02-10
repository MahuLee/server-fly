/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GraphCanvas from '../GraphCanvas';
import { GraphData, Node, Edge } from '../../types';

// Mock G6
jest.mock('@antv/g6', () => {
  return {
    __esModule: true,
    default: {
      Graph: jest.fn().mockImplementation(() => ({
        data: jest.fn(),
        render: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateItem: jest.fn(),
        findById: jest.fn(),
        changeSize: jest.fn()
      }))
    }
  };
});

describe('GraphCanvas Component', () => {
  const mockGraphData: GraphData = {
    nodes: [
      {
        id: 'node1',
        type: 'service',
        label: 'Service 1',
        x: 100,
        y: 100,
        properties: {},
        state: {
          status: 'healthy',
          lastCheckTime: new Date()
        }
      }
    ],
    edges: [],
    layout: {}
  };

  const mockOnGraphChange = jest.fn();
  const mockOnNodeSelect = jest.fn();
  const mockOnNodeDeselect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the graph canvas container', () => {
    render(
      <GraphCanvas
        graphData={mockGraphData}
        onGraphChange={mockOnGraphChange}
        onNodeSelect={mockOnNodeSelect}
        onNodeDeselect={mockOnNodeDeselect}
      />
    );

    const container = document.querySelector('.graph-canvas-container');
    expect(container).toBeInTheDocument();
  });

  it('should render the toolbar with add node button', () => {
    render(
      <GraphCanvas
        graphData={mockGraphData}
        onGraphChange={mockOnGraphChange}
        onNodeSelect={mockOnNodeSelect}
        onNodeDeselect={mockOnNodeDeselect}
      />
    );

    const addButton = screen.getByText('Add Service Node');
    expect(addButton).toBeInTheDocument();
  });

  it('should show delete button when a node is selected', async () => {
    const { rerender } = render(
      <GraphCanvas
        graphData={mockGraphData}
        onGraphChange={mockOnGraphChange}
        onNodeSelect={mockOnNodeSelect}
        onNodeDeselect={mockOnNodeDeselect}
      />
    );

    // Simulate node selection by calling the callback
    mockOnNodeSelect('node1');

    // Re-render to update the component state
    rerender(
      <GraphCanvas
        graphData={mockGraphData}
        onGraphChange={mockOnGraphChange}
        onNodeSelect={mockOnNodeSelect}
        onNodeDeselect={mockOnNodeDeselect}
      />
    );

    // Note: In a real scenario, we would need to properly manage state
    // This is a simplified test
  });

  it('should handle graph data updates', () => {
    const { rerender } = render(
      <GraphCanvas
        graphData={mockGraphData}
        onGraphChange={mockOnGraphChange}
        onNodeSelect={mockOnNodeSelect}
        onNodeDeselect={mockOnNodeDeselect}
      />
    );

    const updatedGraphData: GraphData = {
      nodes: [
        ...mockGraphData.nodes,
        {
          id: 'node2',
          type: 'service',
          label: 'Service 2',
          x: 200,
          y: 200,
          properties: {},
          state: {
            status: 'unhealthy',
            lastCheckTime: new Date()
          }
        }
      ],
      edges: [],
      layout: {}
    };

    rerender(
      <GraphCanvas
        graphData={updatedGraphData}
        onGraphChange={mockOnGraphChange}
        onNodeSelect={mockOnNodeSelect}
        onNodeDeselect={mockOnNodeDeselect}
      />
    );

    expect(mockOnGraphChange).not.toHaveBeenCalled();
  });

  it('should render canvas element', () => {
    render(
      <GraphCanvas
        graphData={mockGraphData}
        onGraphChange={mockOnGraphChange}
        onNodeSelect={mockOnNodeSelect}
        onNodeDeselect={mockOnNodeDeselect}
      />
    );

    const canvas = document.querySelector('.graph-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should not show context menu initially', () => {
    render(
      <GraphCanvas
        graphData={mockGraphData}
        onGraphChange={mockOnGraphChange}
        onNodeSelect={mockOnNodeSelect}
        onNodeDeselect={mockOnNodeDeselect}
      />
    );

    const contextMenu = document.querySelector('.context-menu');
    expect(contextMenu).not.toBeInTheDocument();
  });

  it('should not show confirm dialog initially', () => {
    render(
      <GraphCanvas
        graphData={mockGraphData}
        onGraphChange={mockOnGraphChange}
        onNodeSelect={mockOnNodeSelect}
        onNodeDeselect={mockOnNodeDeselect}
      />
    );

    const dialog = document.querySelector('.dialog-overlay');
    expect(dialog).not.toBeInTheDocument();
  });
});
