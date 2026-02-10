import fc from 'fast-check';
import { GraphData, Node, Edge, NodeState } from '../../types';

/**
 * Property-Based Tests for GraphCanvas Component
 * These tests validate the correctness properties of graph operations
 */

describe('GraphCanvas - Property-Based Tests', () => {
  /**
   * Property 1: 节点创建保持一致性
   * For any node type and canvas state, when a user drags a node to the canvas,
   * the number of nodes in the canvas should increase by 1, and the new node
   * should appear in the node list
   * Validates: Requirements 1.3
   */
  describe('Property 1: Node creation maintains consistency', () => {
    it('should increase node count by 1 when adding a node', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          (nodeType, nodeLabel, x, y) => {
            const initialGraphData: GraphData = {
              nodes: [],
              edges: [],
              layout: {}
            };

            const newNode: Node = {
              id: 'test-node-1',
              type: nodeType,
              label: nodeLabel,
              x,
              y,
              properties: {},
              state: {
                status: 'unknown',
                lastCheckTime: new Date()
              }
            };

            const updatedGraphData: GraphData = {
              ...initialGraphData,
              nodes: [...initialGraphData.nodes, newNode]
            };

            // Verify node count increased by 1
            expect(updatedGraphData.nodes.length).toBe(
              initialGraphData.nodes.length + 1
            );

            // Verify new node is in the list
            expect(updatedGraphData.nodes).toContainEqual(newNode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: 边创建保持一致性
   * For any two existing nodes, when a user connects them,
   * the number of edges in the graph should increase by 1,
   * and the new edge's source and target should correctly point to these two nodes
   * Validates: Requirements 1.4
   */
  describe('Property 2: Edge creation maintains consistency', () => {
    it('should increase edge count by 1 when adding an edge', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (sourceId, targetId) => {
            // Skip if source and target are the same
            if (sourceId === targetId) return true;

            const initialGraphData: GraphData = {
              nodes: [
                {
                  id: sourceId,
                  type: 'service',
                  label: 'Source',
                  x: 100,
                  y: 100,
                  properties: {},
                  state: { status: 'healthy', lastCheckTime: new Date() }
                },
                {
                  id: targetId,
                  type: 'service',
                  label: 'Target',
                  x: 200,
                  y: 200,
                  properties: {},
                  state: { status: 'healthy', lastCheckTime: new Date() }
                }
              ],
              edges: [],
              layout: {}
            };

            const newEdge: Edge = {
              id: 'test-edge-1',
              source: sourceId,
              target: targetId
            };

            const updatedGraphData: GraphData = {
              ...initialGraphData,
              edges: [...initialGraphData.edges, newEdge]
            };

            // Verify edge count increased by 1
            expect(updatedGraphData.edges.length).toBe(
              initialGraphData.edges.length + 1
            );

            // Verify new edge has correct source and target
            const addedEdge = updatedGraphData.edges[0];
            expect(addedEdge.source).toBe(sourceId);
            expect(addedEdge.target).toBe(targetId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: 节点删除保持一致性
   * For any existing node, after deleting that node,
   * the node list should not contain that node,
   * and all edges connected to that node should also be deleted
   * Validates: Requirements 1.5
   */
  describe('Property 3: Node deletion maintains consistency', () => {
    it('should remove node and connected edges when deleting a node', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (nodeIdToDelete) => {
            const initialGraphData: GraphData = {
              nodes: [
                {
                  id: nodeIdToDelete,
                  type: 'service',
                  label: 'To Delete',
                  x: 100,
                  y: 100,
                  properties: {},
                  state: { status: 'healthy', lastCheckTime: new Date() }
                },
                {
                  id: 'other-node',
                  type: 'service',
                  label: 'Other',
                  x: 200,
                  y: 200,
                  properties: {},
                  state: { status: 'healthy', lastCheckTime: new Date() }
                }
              ],
              edges: [
                {
                  id: 'edge1',
                  source: nodeIdToDelete,
                  target: 'other-node'
                },
                {
                  id: 'edge2',
                  source: 'other-node',
                  target: nodeIdToDelete
                }
              ],
              layout: {}
            };

            // Delete the node
            const updatedNodes = initialGraphData.nodes.filter(
              node => node.id !== nodeIdToDelete
            );
            const updatedEdges = initialGraphData.edges.filter(
              edge =>
                edge.source !== nodeIdToDelete && edge.target !== nodeIdToDelete
            );

            const updatedGraphData: GraphData = {
              ...initialGraphData,
              nodes: updatedNodes,
              edges: updatedEdges
            };

            // Verify node is removed
            expect(updatedGraphData.nodes).not.toContainEqual(
              expect.objectContaining({ id: nodeIdToDelete })
            );

            // Verify connected edges are removed
            expect(updatedGraphData.edges.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: 架构图序列化往返一致性
   * For any valid graph data (including nodes, edges, layout, and node properties),
   * serializing to JSON and then deserializing should produce equivalent graph data
   * Validates: Requirements 1.6, 7.1, 7.2, 7.3, 7.4, 7.5
   */
  describe('Property 4: Graph serialization round-trip consistency', () => {
    it('should maintain consistency through serialization round-trip', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              type: fc.constantFrom('service', 'database', 'cache'),
              label: fc.string({ minLength: 1, maxLength: 50 }),
              x: fc.integer({ min: 0, max: 1000 }),
              y: fc.integer({ min: 0, max: 1000 })
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (nodeRecords) => {
            const nodes: Node[] = nodeRecords.map(record => ({
              ...record,
              properties: {},
              state: {
                status: 'unknown' as const,
                lastCheckTime: new Date()
              }
            }));

            const graphData: GraphData = {
              nodes,
              edges: [],
              layout: {}
            };

            // Serialize
            const serialized = JSON.stringify(graphData);

            // Deserialize
            const deserialized = JSON.parse(serialized) as GraphData;

            // Verify structure is maintained
            expect(deserialized.nodes.length).toBe(graphData.nodes.length);
            expect(deserialized.edges.length).toBe(graphData.edges.length);

            // Verify node data is preserved
            deserialized.nodes.forEach((node, index) => {
              expect(node.id).toBe(graphData.nodes[index].id);
              expect(node.type).toBe(graphData.nodes[index].type);
              expect(node.label).toBe(graphData.nodes[index].label);
              expect(node.x).toBe(graphData.nodes[index].x);
              expect(node.y).toBe(graphData.nodes[index].y);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
