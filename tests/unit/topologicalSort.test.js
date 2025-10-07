// Unit tests for topological sort
// Tests execution ordering and cycle detection

import { jest } from '@jest/globals';

// Import the module to test
const topologicalSortModule = await import('../../src/lib/topologicalSort.js');
const { orderFlowNodes } = topologicalSortModule;

describe('Topological Sort', () => {
  // Test: Sort linear chain (A → B → C)
  test('should sort linear chain in correct order', () => {
    const nodes = [
      { id: 'node-c', type: 'template', data: {} },
      { id: 'node-a', type: 'template', data: {} },
      { id: 'node-b', type: 'template', data: {} }
    ];

    const edges = [
      { id: 'e1', source: 'node-a', target: 'node-b', type: 'chain' },
      { id: 'e2', source: 'node-b', target: 'node-c', type: 'chain' }
    ];

    const ordered = orderFlowNodes(nodes, edges);

    expect(ordered).toHaveLength(3);
    expect(ordered[0].id).toBe('node-a');
    expect(ordered[1].id).toBe('node-b');
    expect(ordered[2].id).toBe('node-c');
  });

  // Test: Sort parallel branches (A → B, A → C)
  test('should handle parallel branches correctly', () => {
    const nodes = [
      { id: 'node-a', type: 'template', data: {} },
      { id: 'node-b', type: 'template', data: {} },
      { id: 'node-c', type: 'template', data: {} }
    ];

    const edges = [
      { id: 'e1', source: 'node-a', target: 'node-b', type: 'chain' },
      { id: 'e2', source: 'node-a', target: 'node-c', type: 'chain' }
    ];

    const ordered = orderFlowNodes(nodes, edges);

    expect(ordered).toHaveLength(3);
    expect(ordered[0].id).toBe('node-a');
    // node-b and node-c can be in any order (both depend on node-a)
    const remainingIds = ordered.slice(1).map(n => n.id).sort();
    expect(remainingIds).toEqual(['node-b', 'node-c']);
  });

  // Test: Detect simple cycle (A → B → A)
  test('should detect simple cycle', () => {
    const nodes = [
      { id: 'node-a', type: 'template', data: {} },
      { id: 'node-b', type: 'template', data: {} }
    ];

    const edges = [
      { id: 'e1', source: 'node-a', target: 'node-b', type: 'chain' },
      { id: 'e2', source: 'node-b', target: 'node-a', type: 'chain' }
    ];

    expect(() => orderFlowNodes(nodes, edges)).toThrow(/circular dependency/i);
  });

  // Test: Detect complex cycle (A → B → C → A)
  test('should detect complex cycle', () => {
    const nodes = [
      { id: 'node-a', type: 'template', data: {} },
      { id: 'node-b', type: 'template', data: {} },
      { id: 'node-c', type: 'template', data: {} }
    ];

    const edges = [
      { id: 'e1', source: 'node-a', target: 'node-b', type: 'chain' },
      { id: 'e2', source: 'node-b', target: 'node-c', type: 'chain' },
      { id: 'e3', source: 'node-c', target: 'node-a', type: 'chain' }
    ];

    expect(() => orderFlowNodes(nodes, edges)).toThrow(/circular dependency/i);
  });

  // Test: Handle single node
  test('should handle single node without edges', () => {
    const nodes = [{ id: 'node-a', type: 'template', data: {} }];
    const edges = [];

    const ordered = orderFlowNodes(nodes, edges);

    expect(ordered).toHaveLength(1);
    expect(ordered[0].id).toBe('node-a');
  });

  // Test: Handle disconnected graph
  test('should handle disconnected nodes', () => {
    const nodes = [
      { id: 'node-a', type: 'template', data: {} },
      { id: 'node-b', type: 'template', data: {} },
      { id: 'node-c', type: 'template', data: {} }
    ];

    // Only a and b are connected
    const edges = [
      { id: 'e1', source: 'node-a', target: 'node-b', type: 'chain' }
    ];

    const ordered = orderFlowNodes(nodes, edges);

    expect(ordered).toHaveLength(3);
    // node-a must come before node-b
    const aIndex = ordered.findIndex(n => n.id === 'node-a');
    const bIndex = ordered.findIndex(n => n.id === 'node-b');
    expect(aIndex).toBeLessThan(bIndex);
  });

  // Test: Ignore data edges (only chain edges matter for ordering)
  test('should ignore data edges for topological sort', () => {
    const nodes = [
      { id: 'node-a', type: 'template', data: {} },
      { id: 'node-b', type: 'template', data: {} },
      { id: 'node-c', type: 'template', data: {} }
    ];

    const edges = [
      { id: 'e1', source: 'node-a', target: 'node-b', type: 'data' }, // Should be ignored
      { id: 'e2', source: 'node-b', target: 'node-c', type: 'chain' }
    ];

    const ordered = orderFlowNodes(nodes, edges);

    expect(ordered).toHaveLength(3);
    // node-b must come before node-c (chain edge)
    const bIndex = ordered.findIndex(n => n.id === 'node-b');
    const cIndex = ordered.findIndex(n => n.id === 'node-c');
    expect(bIndex).toBeLessThan(cIndex);
  });
});
