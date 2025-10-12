// Topological sort for flow node execution ordering
// Uses graphlib for robust cycle detection and dependency resolution

import graphlib from 'graphlib';
const { Graph, alg } = graphlib;

/**
 * Order flow nodes in topological (execution) order based on chain edges
 * @param {Array} nodes - Array of flow nodes
 * @param {Array} edges - Array of flow edges
 * @returns {Array} Nodes ordered for execution (template nodes only)
 * @throws {Error} If circular dependency detected
 */
export function orderFlowNodes(nodes, edges) {
  // Create directed graph
  const graph = new Graph();

  // Add all nodes to graph
  nodes.forEach(node => {
    graph.setNode(node.id, node);
  });

  // Add only chain edges (execution dependencies)
  // Data edges don't affect execution order
  edges
    .filter(edge => edge.type === 'chain')
    .forEach(edge => {
      graph.setEdge(edge.source, edge.target);
    });

  // Check for circular dependencies
  if (!alg.isAcyclic(graph)) {
    const cycles = alg.findCycles(graph);
    const cycleDescription = cycles[0].join(' → ');
    throw new Error(
      `Circular dependency detected: ${cycleDescription} → ${cycles[0][0]}`
    );
  }

  // Perform topological sort
  const sortedNodeIds = alg.topsort(graph);

  // Map sorted IDs back to node objects
  return sortedNodeIds.map(id => graph.node(id));
}

export default { orderFlowNodes };
