import fc from 'fast-check';
import { GraphDataModel } from '../GraphDataModel';
import { GraphData, Node, Edge } from '../../types';

describe('GraphDataModel - Property-Based Tests', () => {
  /**
   * Property 4: 架构图序列化往返一致性
   * For any valid graph data, serializing to JSON and then deserializing
   * should produce an equivalent graph data object
   * Validates: Requirements 1.6, 7.1, 7.2, 7.3, 7.4, 7.5
   */
  describe('Property 4: Graph serialization round-trip consistency', () => {
    // Arbitraries for generating test data
    const nodeArbitrary = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('service', 'database', 'cache', 'queue'),
      label: fc.string({ minLength: 1, maxLength: 50 }),
      x: fc.integer({ min: 0, max: 1000 }),
      y: fc.integer({ min: 0, max: 1000 }),
      properties: fc.constant({}),
      state: fc.record({
        status: fc.constantFrom('healthy', 'unhealthy', 'warning', 'unknown') as any,
        lastCheckTime: fc.date(),
        message: fc.option(fc.string({ maxLength: 100 }))
      })
    }) as any;

    const edgeArbitrary = fc.record({
      id: fc.uuid(),
      source: fc.uuid(),
      target: fc.uuid(),
      label: fc.option(fc.string({ maxLength: 50 }))
    }) as any;

    const graphDataArbitrary = fc.record({
      nodes: fc.array(nodeArbitrary, { maxLength: 10 }),
      edges: fc.array(edgeArbitrary, { maxLength: 10 }),
      layout: fc.constant({})
    }) as any;

    it('should maintain data integrity through serialize/deserialize cycle', async () => {
      await fc.assert(
        fc.asyncProperty(graphDataArbitrary, async (originalData: GraphData) => {
          // Serialize to JSON
          const json = GraphDataModel.serialize(originalData);

          // Deserialize back
          const deserializedData = GraphDataModel.deserialize(json);

          // Verify structure is preserved
          expect(deserializedData.nodes.length).toBe(originalData.nodes.length);
          expect(deserializedData.edges.length).toBe(originalData.edges.length);

          // Verify node data is preserved
          deserializedData.nodes.forEach((node, index) => {
            const original = originalData.nodes[index];
            expect(node.id).toBe(original.id);
            expect(node.type).toBe(original.type);
            expect(node.label).toBe(original.label);
            expect(node.x).toBe(original.x);
            expect(node.y).toBe(original.y);
          });

          // Verify edge data is preserved
          deserializedData.edges.forEach((edge, index) => {
            const original = originalData.edges[index];
            expect(edge.id).toBe(original.id);
            expect(edge.source).toBe(original.source);
            expect(edge.target).toBe(original.target);
            expect(edge.label).toBe(original.label);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should produce valid JSON that can be parsed', async () => {
      await fc.assert(
        fc.asyncProperty(graphDataArbitrary, async (data: GraphData) => {
          const json = GraphDataModel.serialize(data);

          // Verify it's valid JSON
          expect(() => JSON.parse(json)).not.toThrow();

          // Verify parsed JSON matches original structure
          const parsed = JSON.parse(json);
          expect(Array.isArray(parsed.nodes)).toBe(true);
          expect(Array.isArray(parsed.edges)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty graph data', async () => {
      const emptyData = GraphDataModel.createEmpty();
      const json = GraphDataModel.serialize(emptyData);
      const deserialized = GraphDataModel.deserialize(json);

      expect(deserialized.nodes).toEqual([]);
      expect(deserialized.edges).toEqual([]);
    });

    it('should preserve node count through round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(nodeArbitrary, { minLength: 1, maxLength: 20 }) as any,
          async (nodes: Node[]) => {
            const data: GraphData = {
              nodes,
              edges: [],
              layout: {}
            };

            const json = GraphDataModel.serialize(data);
            const deserialized = GraphDataModel.deserialize(json);

            expect(deserialized.nodes.length).toBe(nodes.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve edge count through round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(edgeArbitrary, { minLength: 1, maxLength: 20 }) as any,
          async (edges: Edge[]) => {
            const data: GraphData = {
              nodes: [],
              edges,
              layout: {}
            };

            const json = GraphDataModel.serialize(data);
            const deserialized = GraphDataModel.deserialize(json);

            expect(deserialized.edges.length).toBe(edges.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in labels', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              label: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.length > 0),
              x: fc.integer({ min: 0, max: 1000 }),
              y: fc.integer({ min: 0, max: 1000 }),
              properties: fc.constant({}),
              state: fc.record({
                status: fc.constantFrom('healthy', 'unhealthy', 'warning', 'unknown') as any,
                lastCheckTime: fc.date()
              })
            }) as any,
            { maxLength: 5 }
          ) as any,
          async (nodes: Node[]) => {
            const data: GraphData = {
              nodes,
              edges: [],
              layout: {}
            };

            const json = GraphDataModel.serialize(data);
            const deserialized = GraphDataModel.deserialize(json);

            // Verify special characters are preserved
            deserialized.nodes.forEach((node, index) => {
              expect(node.label).toBe(nodes[index].label);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent - multiple round-trips produce same result', async () => {
      await fc.assert(
        fc.asyncProperty(graphDataArbitrary, async (originalData: GraphData) => {
          // First round-trip
          const json1 = GraphDataModel.serialize(originalData);
          const data1 = GraphDataModel.deserialize(json1);

          // Second round-trip
          const json2 = GraphDataModel.serialize(data1);
          const data2 = GraphDataModel.deserialize(json2);

          // Third round-trip
          const json3 = GraphDataModel.serialize(data2);
          const data3 = GraphDataModel.deserialize(json3);

          // All should be equivalent
          expect(json1).toBe(json2);
          expect(json2).toBe(json3);
        }),
        { numRuns: 100 }
      );
    });
  });
});
