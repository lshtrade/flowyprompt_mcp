// src/mcp/tools/flowsShow.js
// MCP Tool: flows/show - Show detailed flow information

import { log } from '../../utils/logger.js';
import { createMcpError } from '../../utils/errorHandler.js';
import githubService from '../../services/githubService.js';
import cacheService from '../../services/cacheService.js';

/**
 * Handle flows/show tool request
 * @param {object} args - Tool arguments {flowName: string, ref?: string, includePositions?: boolean}
 * @returns {Promise<object>} MCP tool response with detailed flow information
 */
export default async function flowsShowTool(args) {
  const startTime = Date.now();
  const { flowName, ref = 'main', includePositions = false } = args;

  if (!flowName) {
    throw createMcpError('INVALID_REQUEST', 'Flow name is required', 'request');
  }

  try {
    log.info('Processing flows_show request', { flowName, ref, includePositions }, 'flowsShowTool');

    // Check cache for flow details
    const cacheKey = `flows:show:${flowName}:${ref}:${includePositions}`;
    let cachedFlow = await cacheService.get(cacheKey);

    if (cachedFlow) {
      const latencyMs = Date.now() - startTime;
      log.info('Returning cached flow details', {
        flowName,
        latencyMs,
        cached: true
      }, 'flowsShowTool');

      return {
        ...cachedFlow,
        cached: true
      };
    }

    // Fetch flow file content from GitHub
    const result = await githubService.fetchFlow(flowName, ref);
    const flowFileContent = result.content;

    // Validate flow file has required structure
    if (!flowFileContent) {
      throw createMcpError('NOT_FOUND', `Flow file not found: ${flowName}`, 'flows/show');
    }

    if (!flowFileContent.flows || !Array.isArray(flowFileContent.flows)) {
      throw createMcpError('INVALID_FLOW', 'Flow file missing flows array', 'flows/show');
    }

    if (flowFileContent.flows.length === 0) {
      throw createMcpError('INVALID_FLOW', 'Flow file has empty flows array', 'flows/show');
    }

    // Extract the first flow
    const flow = flowFileContent.flows[0];

    if (!flow.meta) {
      throw createMcpError('INVALID_FLOW', 'Flow missing meta object', 'flows/show');
    }

    // Build detailed flow information
    const flowDetails = {
      meta: {
        id: flow.meta.id,
        name: flow.meta.name,
        version: flow.meta.version,
        description: flow.meta.description || '',
        created_at: flow.meta.created_at,
        updated_at: flow.meta.updated_at
      },
      metadata: flowFileContent.metadata,
      statistics: {
        totalNodes: flow.nodes.length,
        totalEdges: flow.edges.length,
        templateNodes: flow.nodes.filter(n => n.type === 'template').length,
        inputNodes: flow.nodes.filter(n => n.type === 'multi_input').length,
        resultNodes: flow.nodes.filter(n => n.type === 'result').length
      },
      nodes: flow.nodes.map(node => {
        const nodeInfo = {
          id: node.id,
          type: node.type,
          label: node.data.label || node.id
        };

        // Add position if requested
        if (includePositions && node.position) {
          nodeInfo.position = node.position;
        }

        // Add type-specific data
        if (node.type === 'template') {
          nodeInfo.template = node.data.template;
          nodeInfo.variables = node.data.variables || [];
          nodeInfo.selectedTemplateId = node.data.selectedTemplateId;

          // Include variable value sets if they exist
          if (node.data.variableValueSets && node.data.variableValueSets.length > 0) {
            nodeInfo.variableValueSets = node.data.variableValueSets.map(vs => ({
              id: vs.id,
              name: vs.name,
              description: vs.description || '',
              values: vs.values
            }));
          }
        } else if (node.type === 'multi_input') {
          nodeInfo.variables = node.data.variables || [];
        } else if (node.type === 'result') {
          nodeInfo.content = node.data.content || '';
          nodeInfo.isSaved = node.data.isSaved || false;
          nodeInfo.templateTitle = node.data.templateTitle || '';
        }

        return nodeInfo;
      }),
      edges: flow.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        connectionType: edge.data?.connectionType || 'unknown',
        type: edge.type || 'default'
      })),
      executionFlow: buildExecutionFlow(flow)
    };

    // Cache the flow details
    await cacheService.set(cacheKey, flowDetails);

    const latencyMs = Date.now() - startTime;
    log.info('Successfully processed flows_show', {
      flowName,
      nodeCount: flowDetails.statistics.totalNodes,
      edgeCount: flowDetails.statistics.totalEdges,
      latencyMs,
      cached: false
    }, 'flowsShowTool');

    return {
      ...flowDetails,
      cached: false
    };
  } catch (error) {
    log.error('Error processing flows_show', error, { flowName, ref }, 'flowsShowTool');

    throw createMcpError(
      error.code || 'INTERNAL_ERROR',
      error.message || 'Failed to show flow details'
    );
  }
}

/**
 * Build execution flow chain from nodes and edges
 * @param {object} flow - Flow object
 * @returns {array} Array of execution steps
 */
function buildExecutionFlow(flow) {
  const templateNodes = flow.nodes.filter(n => n.type === 'template');
  const chainEdges = flow.edges.filter(e => e.data?.connectionType === 'chain');

  if (templateNodes.length === 0) {
    return [];
  }

  // Build execution order from chain edges
  const executionOrder = [];
  const visited = new Set();

  // Find starting template nodes (no incoming chain edges)
  const targetIds = new Set(chainEdges.map(e => e.target));
  const startNodes = templateNodes.filter(n => !targetIds.has(n.id));

  // Build chain
  function followChain(nodeId) {
    if (visited.has(nodeId)) return;

    const node = flow.nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'template') return;

    visited.add(nodeId);
    executionOrder.push({
      nodeId: node.id,
      label: node.data.label || node.id,
      template: node.data.selectedTemplateId || 'unknown',
      variables: node.data.variables || []
    });

    // Find next node in chain
    const nextEdge = chainEdges.find(e => e.source === nodeId);
    if (nextEdge) {
      followChain(nextEdge.target);
    }
  }

  // Start from each starting node
  startNodes.forEach(node => followChain(node.id));

  // Add any remaining template nodes not in chain
  templateNodes.forEach(node => {
    if (!visited.has(node.id)) {
      executionOrder.push({
        nodeId: node.id,
        label: node.data.label || node.id,
        template: node.data.selectedTemplateId || 'unknown',
        variables: node.data.variables || [],
        isolated: true
      });
    }
  });

  return executionOrder;
}
